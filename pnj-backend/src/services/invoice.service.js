'use strict'

const {
  sequelize,
  Invoice,
  InvoiceItem,
  Payment,
  Project,
  Customer,
  Fleet,
  Driver,
  DeliveryOrder,
} = require('../models')
const repo = require('../repositories/invoice.repository')
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} = require('../utils/AppError')
const { generateInvoiceNumber } = require('../utils/numberGenerator')
const lampiranSvc = require('./lampiran.service')
const { randomUUID } = require('crypto')
const { Op, UniqueConstraintError } = require('sequelize')
const { addDaysDateOnly, todayDateOnly } = require('../utils/dateOnly')
const {
  normalizeIdempotencyKey,
  hashIdempotencyPayload,
  assertIdempotencyMatch,
} = require('../utils/idempotency')
const {
  calculateRemainingAmount,
  calculatePaidAmountAfterDownPaymentChange,
} = require('../utils/invoiceAmounts')

const STATUS = {
  DRAFT:       'draft',
  SENT:        'sent',
  OUTSTANDING: 'outstanding',
  PAID:        'paid',
  VOID:        'void',
  // Status dari data impor/sistem lama. Tetap diterima agar pembatalan
  // dilakukan lewat fitur Void oleh admin dan tercatat di audit trail.
  CANCELLED:   'cancelled',
  CANCELED:    'canceled',
}

const DELIVERY_PRICING_MODE = {
  SHIPMENT: 'shipment',
  ITEM:     'item',
}

const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'

const ALLOWED_TRANSITIONS = {
  [STATUS.DRAFT]:       [STATUS.SENT, STATUS.OUTSTANDING, STATUS.VOID],
  [STATUS.SENT]:        [STATUS.OUTSTANDING, STATUS.VOID],
  [STATUS.OUTSTANDING]: [STATUS.PAID, STATUS.VOID],
  // paid → sent TIDAK ditaruh di sini secara sengaja: pembatalan status lunas
  // hanya boleh lewat revertToUnpaid() (yang menghapus pembayaran reguler &
  // recompute paid_amount), bukan lewat endpoint send() generik.
  [STATUS.PAID]:        [],
  [STATUS.VOID]:        [],
  [STATUS.CANCELLED]:   [STATUS.VOID],
  [STATUS.CANCELED]:    [STATUS.VOID],
}

function canTransition(current, next) {
  return (ALLOWED_TRANSITIONS[current] || []).includes(next)
}

const FINAL_STATUSES = [STATUS.PAID, STATUS.VOID]

function periodToRange(period) {
  if (!period || period === 'all') return null
  const today = todayDateOnly()
  const [year, month] = today.split('-').map(Number)
  const format = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()

  switch (period) {
    case 'today': return { from: today, to: today }
    case 'week': return { from: addDaysDateOnly(today, -7), to: today }
    case 'month': {
      return {
        from: format(year, month, 1),
        to:   format(year, month, lastDay(year, month)),
      }
    }
    case 'last_month': {
      const previousMonth = month === 1 ? 12 : month - 1
      const previousYear = month === 1 ? year - 1 : year
      return {
        from: format(previousYear, previousMonth, 1),
        to:   format(previousYear, previousMonth, lastDay(previousYear, previousMonth)),
      }
    }
    default:
      return null
  }
}

// ── HELPER: hitung total invoice dari list items + tax/pph percent ────────
function calcTotals(items, taxPercent, pphPercent, insuranceAmount = 0) {
  const subtotal    = items.reduce(
    (sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0),
    0,
  )
  const taxAmount  = subtotal * Number(taxPercent || 0) / 100
  const pphAmount  = subtotal * Number(pphPercent || 0) / 100
  const insurance  = round2(Number(insuranceAmount) || 0)
  const total      = subtotal + taxAmount - pphAmount + insurance
  return {
    subtotal_amount:  round2(subtotal),
    tax_amount:       round2(taxAmount),
    pph_amount:       round2(pphAmount),
    insurance_amount: insurance,
    total_amount:     round2(total),
  }
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

function assertNotFutureDate(date, label) {
  if (date > todayDateOnly()) {
    throw new BadRequestError(`${label} tidak boleh melewati tanggal hari ini.`)
  }
}

async function assertRegularPaymentDate(invoice, paymentDate, t) {
  assertNotFutureDate(paymentDate, 'Tanggal pembayaran')
  if (paymentDate < invoice.invoice_date) {
    throw new BadRequestError('Tanggal pembayaran tidak boleh sebelum tanggal invoice.')
  }
  const latest = await Payment.findOne({
    where: { invoice_id: invoice.id, is_down_payment: false },
    attributes: ['payment_date'],
    order: [['payment_date', 'DESC'], ['id', 'DESC']],
    transaction: t,
  })
  if (latest && paymentDate < latest.payment_date) {
    throw new BadRequestError(`Tanggal pembayaran tidak boleh sebelum pembayaran terakhir (${latest.payment_date}).`)
  }
}

function fleetStatusLabel(status) {
  return {
    active:   'aktif',
    inactive: 'tidak aktif',
    repair:   'perbaikan',
    sold:     'terjual',
  }[status] || status
}

function driverStatusLabel(status) {
  return {
    active:   'aktif',
    inactive: 'tidak aktif',
  }[status] || status
}

function effectiveServiceType(serviceType, customServiceName) {
  if (serviceType === 'rental') return 'rental'
  if (serviceType === 'other') {
    const name = String(customServiceName || '').toLowerCase()
    if (name.includes('penyewaan') || name.includes('sewa')) return 'rental'
    if (name.includes('pengiriman')) return 'delivery'
  }
  return 'delivery'
}

/**
 * Decorate Invoice response — pisahkan DP dari payments biasa supaya FE
 * gampang render section terpisah. Tambah field turunan:
 *   - down_payment:        object | null (Payment dengan is_down_payment=true)
 *   - down_payment_amount: number (0 kalau tidak ada DP)
 *   - has_down_payment:    boolean
 *   - remaining_amount:    total - paid_amount
 *   - payments:            array (sudah exclude DP)
 */
function decorate(row) {
  if (!row) return row
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row

  const allPayments = Array.isArray(plain.payments) ? plain.payments : []
  const dpRow      = allPayments.find(p => p.is_down_payment === true) || null
  const regularPayments = allPayments.filter(p => p.is_down_payment !== true)

  const total = round2(plain.total_amount || 0)
  const paid  = round2(plain.paid_amount  || 0)

  plain.delivery_pricing_mode = resolveDeliveryPricingMode(
    effectiveServiceType(plain.service_type || 'delivery', plain.custom_service_name),
    plain.delivery_pricing_mode,
  )
  plain.down_payment        = dpRow
  plain.down_payment_amount = dpRow ? round2(dpRow.amount) : 0
  plain.has_down_payment    = !!dpRow
  plain.remaining_amount    = calculateRemainingAmount(total, paid)
  plain.payments            = regularPayments
  if (plain.status === STATUS.PAID && !plain.settlement_date && allPayments.length > 0) {
    plain.settlement_date = allPayments.reduce(
      (latest, payment) => payment.payment_date > latest ? payment.payment_date : latest,
      allPayments[0].payment_date,
    )
  }
  if (plain.status !== STATUS.PAID) plain.settlement_date = null
  // Field ini hanya untuk koordinasi retry di backend dan tidak perlu diekspos.
  delete plain.idempotency_key
  delete plain.idempotency_payload_hash

  return plain
}

async function resolveBillingScope(payload, t) {
  const [project, customer] = await Promise.all([
    payload.project_uuid || payload.project_id
      ? Project.findOne({
          where: payload.project_uuid ? { uuid: payload.project_uuid } : { id: payload.project_id },
          transaction: t,
        })
      : null,
    payload.customer_uuid || payload.customer_id
      ? Customer.findOne({
          where: payload.customer_uuid ? { uuid: payload.customer_uuid } : { id: payload.customer_id },
          transaction: t,
        })
      : null,
  ])

  if ((payload.project_uuid || payload.project_id) && !project) throw new NotFoundError('Project tidak ditemukan.')
  if ((payload.customer_uuid || payload.customer_id) && !customer) throw new NotFoundError('Customer tidak ditemukan.')
  if (project && customer && Number(project.customer_id) !== Number(customer.id)) {
    throw new BadRequestError('Customer tidak sesuai dengan project yang dipilih.')
  }

  const customerId = project ? project.customer_id : customer?.id
  if (!customerId) throw new BadRequestError('Pilih project atau customer untuk invoice.')

  return {
    projectId:  project?.id || null,
    customerId,
  }
}

function assertRentalItemsUseFleet(items, serviceType) {
  if (serviceType !== 'rental') return

  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestError('Minimal 1 rincian item wajib diisi untuk invoice penyewaan.')
  }

  items.forEach((item, idx) => {
    if (!item.fleet_uuid && !item.fleet_id) {
      throw new BadRequestError(`Item penyewaan baris ${idx + 1} wajib memilih armada aktif dari master.`)
    }
  })
}

function resolveDeliveryPricingMode(serviceType, mode) {
  if (serviceType === 'rental') return DELIVERY_PRICING_MODE.SHIPMENT
  return mode || DELIVERY_PRICING_MODE.SHIPMENT
}

function isDeliveryAdditionalChargeItem(item) {
  return item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined)
}

function assertDeliveryItemPricing(items, serviceType, deliveryPricingMode) {
  if (serviceType === 'rental') return

  const billableItems = (items || []).filter(item => !isDeliveryAdditionalChargeItem(item))
  if (billableItems.length === 0) {
    if (deliveryPricingMode === DELIVERY_PRICING_MODE.ITEM) {
      throw new BadRequestError('Minimal 1 rincian barang/muatan wajib diisi untuk mode harga per barang.')
    }
    return
  }

  if (deliveryPricingMode === DELIVERY_PRICING_MODE.ITEM) {
    billableItems.forEach((item, idx) => {
      if (Number(item.qty || 0) <= 0) {
        throw new BadRequestError(`Qty harga barang baris ${idx + 1} wajib lebih dari 0.`)
      }
      if (Number(item.unit_price || 0) <= 0) {
        throw new BadRequestError(`Harga barang baris ${idx + 1} wajib diisi untuk mode harga per barang.`)
      }
    })
    return
  }

  const hasShipmentPrice = billableItems.some(item => Number(item.qty || 0) > 0 && Number(item.unit_price || 0) > 0)
  if (!hasShipmentPrice) {
    throw new BadRequestError('Harga pengiriman wajib diisi.')
  }
}

/**
 * Resolve fleet_uuid/fleet_id pada items array → fleet_id.
 * Fleet TBD diperbolehkan (item dengan plate manual masih relevan).
 */
async function resolveItemFleets(items, t) {
  const uuids = [...new Set(items.map(i => i.fleet_uuid).filter(Boolean))]
  const ids   = [...new Set(items.map(i => i.fleet_id).filter(Boolean))]
  if (uuids.length === 0 && ids.length === 0) return { byUuid: new Map(), byId: new Map() }

  const where = {}
  if (uuids.length > 0 && ids.length > 0) {
    where[require('sequelize').Op.or] = [{ uuid: uuids }, { id: ids }]
  } else if (uuids.length > 0) {
    where.uuid = uuids
  } else {
    where.id = ids
  }

  const fleets = await Fleet.findAll({
    where,
    attributes: ['id', 'uuid', 'status', 'plate_number', 'name'],
    transaction: t,
  })
  const byUuid = new Map(fleets.map(f => [f.uuid, f.id]))
  const byId   = new Map(fleets.map(f => [Number(f.id), f.id]))
  for (const u of uuids) {
    if (!byUuid.has(u)) {
      throw new NotFoundError(`Fleet dengan uuid ${u} tidak ditemukan.`)
    }
  }
  for (const id of ids) {
    if (!byId.has(Number(id))) {
      throw new NotFoundError(`Fleet dengan id ${id} tidak ditemukan.`)
    }
  }
  for (const fleet of fleets) {
    if (fleet.status !== 'active') {
      const label = `${fleet.name || 'Fleet'} ${fleet.plate_number || ''}`.trim()
      throw new BadRequestError(`Armada ${label} berstatus ${fleetStatusLabel(fleet.status)} dan tidak dapat dipakai pada invoice.`)
    }
  }
  return { byUuid, byId }
}

async function resolveItemDrivers(items, t) {
  const uuids = [...new Set(items.map(i => i.driver_uuid).filter(Boolean))]
  const ids   = [...new Set(items.map(i => i.driver_id).filter(Boolean))]
  if (uuids.length === 0 && ids.length === 0) return { byUuid: new Map(), byId: new Map() }

  const where = {}
  if (uuids.length > 0 && ids.length > 0) {
    where[require('sequelize').Op.or] = [{ uuid: uuids }, { id: ids }]
  } else if (uuids.length > 0) {
    where.uuid = uuids
  } else {
    where.id = ids
  }

  const drivers = await Driver.findAll({
    where,
    attributes: ['id', 'uuid', 'status', 'name'],
    transaction: t,
  })
  const byUuid = new Map(drivers.map(d => [d.uuid, d.id]))
  const byId   = new Map(drivers.map(d => [Number(d.id), d.id]))
  for (const u of uuids) {
    if (!byUuid.has(u)) {
      throw new NotFoundError(`Supir dengan uuid ${u} tidak ditemukan.`)
    }
  }
  for (const id of ids) {
    if (!byId.has(Number(id))) {
      throw new NotFoundError(`Supir dengan id ${id} tidak ditemukan.`)
    }
  }
  for (const driver of drivers) {
    if (driver.status !== 'active') {
      throw new BadRequestError(`Supir ${driver.name || driver.id} berstatus ${driverStatusLabel(driver.status)} dan tidak dapat dipakai pada invoice.`)
    }
  }
  return { byUuid, byId }
}

function buildItemRows(items, invoiceId, fleetMap, driverMap) {
  return items.map((it) => {
    const qty       = Number(it.qty)
    const unitPrice = Number(it.unit_price)
    return {
      invoice_id:    invoiceId,
      fleet_id:      it.fleet_uuid
        ? fleetMap.byUuid.get(it.fleet_uuid)
        : it.fleet_id
          ? fleetMap.byId.get(Number(it.fleet_id))
          : null,
      driver_id:     it.driver_uuid
        ? driverMap.byUuid.get(it.driver_uuid)
        : it.driver_id
          ? driverMap.byId.get(Number(it.driver_id))
          : null,
      driver_name_manual: it.driver_name_manual || null,
      fleet_label:   it.fleet_label,
      description:   it.description || null,
      period_start:  it.period_start || null,
      period_end:    it.period_end   || null,
      rental_duration_years:  Number(it.rental_duration_years || 0),
      rental_duration_months: Number(it.rental_duration_months || 0),
      rental_duration_days:   Number(it.rental_duration_days || 0),
      rental_duration_hours:  Number(it.rental_duration_hours || 0),
      qty,
      unit:          it.unit || 'Unit',
      cargo_qty:     it.cargo_qty === null || it.cargo_qty === undefined ? null : Number(it.cargo_qty),
      cargo_unit:    it.cargo_unit || null,
      cargo_weight:  it.cargo_weight === null || it.cargo_weight === undefined ? null : Number(it.cargo_weight),
      cargo_volume:  it.cargo_volume === null || it.cargo_volume === undefined ? null : Number(it.cargo_volume),
      cargo_notes:   it.cargo_notes || null,
      unit_price:    unitPrice,
      subtotal:      round2(qty * unitPrice),
      sort_order:    it.sort_order ?? 0,
      source_sj_id:  it.source_sj_id ?? null,
    }
  })
}

function groupRowsBySourceSj(rows) {
  return rows.reduce((acc, row) => {
    if (!row.source_sj_id) return acc
    const key = Number(row.source_sj_id)
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key).push(row)
    return acc
  }, new Map())
}

async function getLockedDeliveryOrder(id, cache, transaction) {
  if (cache.has(id)) return cache.get(id)
  const sj = await DeliveryOrder.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
  if (!sj) throw new BadRequestError('SJ sumber item invoice tidak ditemukan.')
  cache.set(id, sj)
  return sj
}

async function syncSourceSjItem(existingItem, sourceRows, payloadItem, sjCache, transaction) {
  if (!existingItem?.source_sj_id) return

  const sourceSjId = Number(existingItem.source_sj_id)
  const rowsFromSameSj = sourceRows.get(sourceSjId) || []
  const sourceIndex = rowsFromSameSj.findIndex(row => row.uuid === existingItem.uuid)
  if (sourceIndex < 0) {
    throw new BadRequestError('Urutan item sumber SJ tidak dapat dipetakan.')
  }

  const sj = await getLockedDeliveryOrder(sourceSjId, sjCache, transaction)
  const sjItems = Array.isArray(sj.items) ? [...sj.items] : []
  const current = sjItems[sourceIndex] || {}
  sjItems[sourceIndex] = {
    ...current,
    description: payloadItem.description || '',
    qty:         payloadItem.cargo_qty === null || payloadItem.cargo_qty === undefined
      ? Number(payloadItem.qty)
      : Number(payloadItem.cargo_qty),
    unit:        payloadItem.cargo_unit || current.unit || 'Unit',
    weight:      payloadItem.cargo_weight === null || payloadItem.cargo_weight === undefined ? null : Number(payloadItem.cargo_weight),
    volume:      payloadItem.cargo_volume === null || payloadItem.cargo_volume === undefined ? null : Number(payloadItem.cargo_volume),
    notes:       payloadItem.cargo_notes || current.notes || '',
  }
  await sj.update({ items: sjItems }, { transaction })
}

async function replaceInvoiceItems(invoice, payloadItems, transaction) {
  assertRentalItemsUseFleet(payloadItems, effectiveServiceType(invoice.service_type, invoice.custom_service_name))
  const fleetMap = await resolveItemFleets(payloadItems, transaction)
  const driverMap = await resolveItemDrivers(payloadItems, transaction)
  const existingItems = await InvoiceItem.findAll({
    where:       { invoice_id: invoice.id },
    order:       [['sort_order', 'ASC'], ['id', 'ASC']],
    transaction,
  })
  const existingByUuid = new Map(existingItems.map(item => [item.uuid, item]))
  const sourceRows = groupRowsBySourceSj(existingItems)
  const sjCache = new Map()

  const normalizedItems = []
  for (const [idx, payloadItem] of payloadItems.entries()) {
    const existingItem = payloadItem.uuid ? existingByUuid.get(payloadItem.uuid) : null
    const sourceSjId = existingItem?.source_sj_id ? Number(existingItem.source_sj_id) : null

    if (sourceSjId) {
      await syncSourceSjItem(existingItem, sourceRows, payloadItem, sjCache, transaction)
    }

    normalizedItems.push({
      ...payloadItem,
      sort_order:   idx,
      source_sj_id: sourceSjId,
    })
  }

  await InvoiceItem.destroy({ where: { invoice_id: invoice.id }, transaction })
  const itemRows = buildItemRows(normalizedItems, invoice.id, fleetMap, driverMap)
  await InvoiceItem.bulkCreate(itemRows, { transaction })
  return itemRows
}

function sameBillingScope(invoice, sj) {
  if (invoice.project_id) {
    return Number(sj.project_id) === Number(invoice.project_id)
  }

  return !sj.project_id && Number(sj.customer_id) === Number(invoice.customer_id)
}

/**
 * Buat InvoiceItem rows dari items milik satu SJ.
 * period_start dan period_end sengaja dikosongkan (null).
 * source_sj_id diisi dengan sj.id untuk tracking saat detach.
 */
function buildSJItemRows(sj, invoiceId, startOrder) {
  const items = Array.isArray(sj.items) ? sj.items : []
  if (items.length === 0) return []

  const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
  const fleetLabel = fleetIsTbd
    ? 'TBD'
    : `${sj.fleet.name} (${sj.fleet.plate_number})`

  return items.map((item, i) => {
    const cargoQty  = Number(item.qty) || 1
    const qty       = 1
    const unitPrice = 0
    return {
      invoice_id:   invoiceId,
      fleet_id:     fleetIsTbd ? null : sj.fleet_id,
      driver_id:    sj.driver_id || null,
      driver_name_manual: sj.driver_name_manual || null,
      fleet_label:  fleetLabel,
      description:  item.description || null,
      period_start: null,
      period_end:   null,
      qty,
      unit:         'unit',
      cargo_qty:    cargoQty,
      cargo_unit:   item.unit || null,
      cargo_weight: item.weight === null || item.weight === undefined ? null : Number(item.weight),
      cargo_volume: item.volume === null || item.volume === undefined ? null : Number(item.volume),
      cargo_notes:  item.notes || null,
      unit_price:   unitPrice,
      subtotal:     round2(qty * unitPrice),
      sort_order:   startOrder + i,
      source_sj_id: sj.id,
    }
  })
}

/**
 * Map InvoiceItem rows -> SJItem[] untuk auto-create SJ dari invoice.
 * Baris additional charge ("Pembiayaan Lainnya") dikecualikan — bukan barang.
 */
function buildSJItemsFromInvoiceItems(invItems) {
  return (invItems || [])
    .filter(it => !isDeliveryAdditionalChargeItem(it))
    .map(it => ({
      id:          randomUUID(),
      description: it.description || it.fleet_label || '',
      qty:         it.cargo_qty === null || it.cargo_qty === undefined ? Number(it.qty || 0) : Number(it.cargo_qty),
      unit:        it.cargo_unit || it.unit || 'unit',
      weight:      it.cargo_weight === null || it.cargo_weight === undefined ? null : Number(it.cargo_weight),
      volume:      it.cargo_volume === null || it.cargo_volume === undefined ? null : Number(it.cargo_volume),
      notes:       it.cargo_notes || '',
      source_type: 'manual',
    }))
}

/** Header SJ diturunkan dari invoice + item pertama (fleet/driver pengiriman). */
function deriveSJHeaderFromInvoice(invoice, invItems) {
  const first = (invItems || [])[0] || {}
  return {
    project_id:         invoice.project_id || null,
    customer_id:        invoice.customer_id,
    fleet_id:           first.fleet_id || null,
    driver_id:          first.driver_id || null,
    driver_name_manual: first.driver_name_manual || null,
    sj_date:            invoice.delivery_date || invoice.invoice_date,
    origin:             invoice.origin || '-',
    destination:        invoice.destination || '-',
    cargo_description:  invoice.cargo_description || null,
    operational_cost:   0,
  }
}

/**
 * Auto-create / overwrite SJ dari invoice ketika mode manual (1 nomor).
 * Dipanggil di akhir transaksi create()/update(). Guard:
 *   - SJ terkait invoice lain      -> ConflictError SJ_LINKED_OTHER_INVOICE
 *   - SJ ada & belum dikonfirmasi  -> ConflictError SJ_EXISTS_NEEDS_CONFIRM
 * Timpa = replace header+items, status SJ lama dipertahankan.
 */
async function syncManualSj(invoice, payload, actor, t) {
  if (payload.auto_create_sj === false) return
  const effType = effectiveServiceType(invoice.service_type, invoice.custom_service_name)
  if (effType === 'rental') return

  const raw = String(invoice.manual_sj_numbers || '').trim()
  if (!raw || raw.includes(',')) return // kosong / multi-token -> skip (data lama)
  const sjNumber = raw

  const existing = await DeliveryOrder.findOne({
    where:       { sj_number: sjNumber },
    transaction: t,
    lock:        t.LOCK.UPDATE,
  })

  const sameInvoice = existing && Number(existing.invoice_id || 0) === Number(invoice.id)
  if (existing && existing.invoice_id && !sameInvoice) {
    throw new ConflictError(`Nomor SJ ${sjNumber} sudah dipakai invoice lain.`, { code: 'SJ_LINKED_OTHER_INVOICE' })
  }
  if (existing && !sameInvoice && payload.overwrite_sj_confirmed !== true) {
    throw new ConflictError(`Nomor SJ ${sjNumber} sudah ada. Konfirmasi untuk menimpa.`, { code: 'SJ_EXISTS_NEEDS_CONFIRM' })
  }

  const invItems = await InvoiceItem.findAll({
    where:       { invoice_id: invoice.id },
    order:       [['sort_order', 'ASC'], ['id', 'ASC']],
    transaction: t,
  })
  const sjItems = buildSJItemsFromInvoiceItems(invItems)
  const header  = deriveSJHeaderFromInvoice(invoice, invItems)

  if (existing) {
    await existing.update({
      ...header,
      items:                     sjItems,
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
      updated_by:                actor?.id || null,
    }, { transaction: t })
  } else {
    await DeliveryOrder.create({
      sj_number:                 sjNumber,
      ...header,
      items:                     sjItems,
      status:                    'draft',
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
      created_by:                actor?.id || null,
      updated_by:                actor?.id || null,
    }, { transaction: t })
  }
}

/**
 * Recalculate subtotal_amount, tax_amount, pph_amount, total_amount invoice
 * berdasarkan semua invoice_items yang ada saat ini.
 */
async function recalcInvoiceTotals(invoice, t) {
  const items = await InvoiceItem.findAll({
    where:       { invoice_id: invoice.id },
    attributes:  ['qty', 'unit_price'],
    transaction: t,
  })
  const plain  = items.map(i => ({ qty: i.qty, unit_price: i.unit_price }))
  const totals = calcTotals(plain, invoice.tax_percent, invoice.pph_percent, invoice.insurance_amount)
  await invoice.update(totals, { transaction: t })
}

// ── LIST & DETAIL ─────────────────────────────────────────────────────────
async function list(params) {
  const {
    page, limit, search, status,
    project_uuid, customer_uuid,
    period, from, to,
  } = params

  let projectId  = null
  let customerId = null
  if (project_uuid) {
    const p = await Project.findOne({ where: { uuid: project_uuid }, attributes: ['id'] })
    if (!p) return { rows: [], count: 0 }
    projectId = p.id
  }
  if (customer_uuid) {
    const c = await Customer.findOne({ where: { uuid: customer_uuid }, attributes: ['id'] })
    if (!c) return { rows: [], count: 0 }
    customerId = c.id
  }

  let periodRange = null
  if (from || to) {
    periodRange = { from: from || null, to: to || null }
  } else {
    periodRange = periodToRange(period)
  }

  // List view tidak include payments → decorate ringan (just remaining_amount).
  const { rows, count } = await repo.list({
    page, limit, search, status,
    projectId, customerId, periodRange,
  })

  const invoiceIds = rows.map(r => r.id).filter(Boolean)
  const dpInvoiceIds = invoiceIds.length > 0
    ? new Set((await Payment.findAll({
        where: { invoice_id: invoiceIds, is_down_payment: true },
        attributes: ['invoice_id'],
        raw: true,
      })).map(p => Number(p.invoice_id)))
    : new Set()

  return {
    rows: rows.map(r => {
      const plain = r.get ? r.get({ plain: true }) : r
      const total = round2(plain.total_amount || 0)
      const paid  = round2(plain.paid_amount  || 0)
      plain.delivery_pricing_mode = resolveDeliveryPricingMode(
        effectiveServiceType(plain.service_type || 'delivery', plain.custom_service_name),
        plain.delivery_pricing_mode,
      )
      plain.remaining_amount = calculateRemainingAmount(total, paid)
      plain.has_down_payment = dpInvoiceIds.has(Number(plain.id))
      return plain
    }),
    count,
  }
}

/**
 * Summary stats untuk cards di halaman list invoice — dihitung di DB
 * (agregat), bukan dengan menarik semua baris invoice ke memori.
 * Filter yang dipakai sama dengan list() (search, status, customer,
 * project, periode) supaya angka summary konsisten dengan hasil filter
 * yang sedang ditampilkan.
 */
async function getSummaryStats(params) {
  const { Op, fn, literal } = require('sequelize')
  const { search, status, project_uuid, customer_uuid, period, from, to } = params

  let projectId  = null
  let customerId = null
  if (project_uuid) {
    const p = await Project.findOne({ where: { uuid: project_uuid }, attributes: ['id'] })
    if (!p) return emptySummary()
    projectId = p.id
  }
  if (customer_uuid) {
    const c = await Customer.findOne({ where: { uuid: customer_uuid }, attributes: ['id'] })
    if (!c) return emptySummary()
    customerId = c.id
  }

  let periodRange = null
  if (from || to) {
    periodRange = { from: from || null, to: to || null }
  } else {
    periodRange = periodToRange(period)
  }

  const baseWhere = {}
  if (projectId)  baseWhere.project_id  = projectId
  if (customerId) baseWhere.customer_id = customerId
  if (periodRange && (periodRange.from || periodRange.to)) {
    baseWhere.invoice_date = {}
    if (periodRange.from) baseWhere.invoice_date[Op.gte] = periodRange.from
    if (periodRange.to)   baseWhere.invoice_date[Op.lte] = periodRange.to
  }
  if (search) {
    baseWhere[Op.or] = [
      { invoice_number: { [Op.iLike]: `%${search}%` } },
      { notes:          { [Op.iLike]: `%${search}%` } },
    ]
  }

  // status filter dari user (jika ada) di-intersect dengan status yang
  // relevan untuk masing-masing metric — kalau tidak overlap, metric = 0.
  const statusFilter = (status && status !== 'all') ? status : null

  function intersect(allowed) {
    if (!statusFilter) return allowed.length === 1 ? allowed[0] : { [Op.in]: allowed }
    return allowed.includes(statusFilter) ? statusFilter : null
  }

  const businessToday = todayDateOnly()
  const [businessYear, businessMonth] = businessToday.split('-').map(Number)
  const startOfMonth = `${businessYear}-${String(businessMonth).padStart(2, '0')}-01`
  const endOfMonth = `${businessYear}-${String(businessMonth).padStart(2, '0')}-${String(new Date(Date.UTC(businessYear, businessMonth, 0)).getUTCDate()).padStart(2, '0')}`

  // ── Piutang aktif (sent/outstanding, remaining > 0) ──
  // Filter 'outstanding' dari user merepresentasikan piutang aktif secara
  // keseluruhan (sent + outstanding manual), jadi tidak di-intersect ke
  // status 'outstanding' literal saja (yang biasanya tidak punya data).
  const receivableStatus = statusFilter === 'outstanding'
    ? { [Op.in]: ['sent', 'outstanding'] }
    : intersect(['sent', 'outstanding'])
  let totalPiutang = 0
  let jatuhTempo = 0
  let countOutstanding = 0
  if (receivableStatus) {
    const row = await Invoice.findOne({
      where: { ...baseWhere, status: receivableStatus },
      attributes: [
        [fn('COALESCE', fn('SUM', literal('GREATEST(total_amount - paid_amount, 0)')), 0), 'total_piutang'],
        [fn('COUNT', literal('CASE WHEN (total_amount - paid_amount) > 0 THEN 1 END')), 'count_outstanding'],
        [fn('COUNT', literal(`CASE WHEN (total_amount - paid_amount) > 0 AND due_date < '${businessToday}' THEN 1 END`)), 'jatuh_tempo'],
      ],
      raw: true,
    })
    totalPiutang    = round2(Number(row?.total_piutang || 0))
    countOutstanding = Number(row?.count_outstanding || 0)
    jatuhTempo      = Number(row?.jatuh_tempo || 0)
  }

  // ── Lunas bulan ini (berdasarkan tanggal pelunasan bisnis) ──
  const paidStatus = intersect(['paid'])
  let terbayarBulanIni = 0
  let countPaidThisMonth = 0
  if (paidStatus) {
    const row = await Invoice.findOne({
      where: {
        ...baseWhere,
        status: paidStatus,
        settlement_date: { [Op.between]: [startOfMonth, endOfMonth] },
      },
      attributes: [
        [fn('COALESCE', fn('SUM', literal('paid_amount')), 0), 'terbayar'],
        [fn('COUNT', literal('*')), 'count_paid'],
      ],
      raw: true,
    })
    terbayarBulanIni   = round2(Number(row?.terbayar || 0))
    countPaidThisMonth = Number(row?.count_paid || 0)
  }

  // ── Draft belum dikirim ──
  const draftStatus = intersect(['draft'])
  let draftBelumDikirim = 0
  if (draftStatus) {
    draftBelumDikirim = await Invoice.count({ where: { ...baseWhere, status: draftStatus } })
  }

  return {
    totalPiutang,
    jatuhTempo,
    terbayarBulanIni,
    draftBelumDikirim,
    countOutstanding,
    countPaidThisMonth,
  }
}

function emptySummary() {
  return {
    totalPiutang: 0,
    jatuhTempo: 0,
    terbayarBulanIni: 0,
    draftBelumDikirim: 0,
    countOutstanding: 0,
    countPaidThisMonth: 0,
  }
}

async function getByUuid(uuid) {
  const inv = await repo.findByUuid(uuid)
  if (!inv) throw new NotFoundError('Invoice tidak ditemukan.')
  return decorate(inv)
}

// ── DOWN PAYMENT HELPER ───────────────────────────────────────────────────
/**
 * Upsert/clear DP untuk satu invoice. Harus dipanggil dalam transaksi.
 *
 * Behavior:
 *   - dp === undefined → no-op (caller tidak ingin ubah DP)
 *   - dp === null      → hapus DP existing (kalau ada)
 *   - dp = { amount, payment_date, method, ... } → upsert (replace existing or create)
 *
 * Validasi:
 *   - paid_amount invoice di-recompute dari sum semua payments setelah upsert
 *
 * Status TIDAK auto-transition (per kebijakan: DP tidak ubah status).
 *
 * @returns delta paid_amount (untuk caller's recalc kalau perlu)
 */
async function upsertDownPayment(invoice, dp, actor, t) {
  if (dp === undefined) return  // tidak diubah

  // Cari DP existing.
  const existing = await Payment.findOne({
    where: { invoice_id: invoice.id, is_down_payment: true },
    transaction: t,
    lock: t.LOCK.UPDATE,
  })

  // Sum payment regular (non-DP).
  const regularPayments = await Payment.findAll({
    where: { invoice_id: invoice.id, is_down_payment: false },
    attributes: ['amount', 'payment_date'],
    transaction: t,
  })
  const regularPaid = regularPayments.reduce((s, p) => s + Number(p.amount || 0), 0)

  if (dp === null) {
    // Hapus DP existing kalau ada.
    if (existing) {
      await existing.destroy({ transaction: t })
    }
    // Recompute paid_amount.
    const updates = { paid_amount: round2(regularPaid) }
    if (invoice.status === STATUS.PAID && round2(regularPaid) < round2(invoice.total_amount || 0)) {
      updates.status = STATUS.OUTSTANDING
      updates.settlement_date = null
    } else if (invoice.status === STATUS.PAID) {
      updates.settlement_date = regularPayments.reduce(
        (latest, payment) => payment.payment_date > latest ? payment.payment_date : latest,
        '',
      ) || null
    }
    await invoice.update(updates, { transaction: t })
    return
  }

  // Upsert DP.
  assertNotFutureDate(dp.payment_date, 'Tanggal DP')
  if (dp.payment_date < invoice.invoice_date) {
    throw new BadRequestError('Tanggal DP tidak boleh sebelum tanggal invoice.')
  }
  const dpAmount = round2(dp.amount)
  const total = round2(invoice.total_amount || 0)
  const nextPaid = round2(regularPaid + dpAmount)

  if (nextPaid > total + 0.001) {
    throw new BadRequestError(
      `Nominal DP melebihi sisa tagihan setelah pembayaran tercatat (Rp ${Math.max(0, total - regularPaid).toLocaleString('id-ID')}).`,
      { code: 'DOWN_PAYMENT_EXCEEDS_REMAINING' },
    )
  }

  if (existing) {
    await existing.update({
      payment_date: dp.payment_date,
      amount:       dpAmount,
      method:       dp.method,
      proof_path:   dp.proof_path || null,
      notes:        dp.notes || null,
    }, { transaction: t })
  } else {
    await Payment.create({
      invoice_id:      invoice.id,
      payment_date:    dp.payment_date,
      amount:          dpAmount,
      method:          dp.method,
      proof_path:      dp.proof_path || null,
      notes:           dp.notes || null,
      is_down_payment: true,
      created_by:      actor?.id || null,
    }, { transaction: t })
  }

  // Recompute paid_amount = regular + DP.
  const newPaid = nextPaid
  const updates = { paid_amount: newPaid }
  if (invoice.status === STATUS.PAID && newPaid < round2(invoice.total_amount || 0)) {
    updates.status = STATUS.OUTSTANDING
    updates.settlement_date = null
  } else if (invoice.status === STATUS.PAID) {
    updates.settlement_date = regularPayments.reduce(
      (latest, payment) => payment.payment_date > latest ? payment.payment_date : latest,
      dp.payment_date,
    )
  }
  await invoice.update(updates, { transaction: t })
}

// ── CREATE ────────────────────────────────────────────────────────────────
async function findIdempotentInvoice(idempotencyKey, payloadHash, actor, options = {}) {
  if (!idempotencyKey) return null

  const existing = await Invoice.findOne({
    where: { idempotency_key: idempotencyKey },
    ...options,
  })
  if (!existing) return null

  assertIdempotencyMatch(existing, {
    actorId: actor?.id ?? null,
    payloadHash,
  })

  const fresh = await repo.findByUuid(existing.uuid, options)
  return decorate(fresh)
}

function isIdempotencyUniqueError(error) {
  if (!(error instanceof UniqueConstraintError)) return false

  const errorFields = Object.keys(error.fields || {})
  const errorPaths = (error.errors || []).map(item => item.path)
  const constraint = String(error.parent?.constraint || error.original?.constraint || '')
  return errorFields.includes('idempotency_key') ||
    errorPaths.includes('idempotency_key') ||
    constraint.includes('idempotency_key')
}

async function create(payload, actor, options = {}) {
  const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey)
  const payloadHash = idempotencyKey ? hashIdempotencyPayload(payload) : null

  const previous = await findIdempotentInvoice(idempotencyKey, payloadHash, actor)
  if (previous) return { invoice: previous, replayed: true }

  try {
    const invoice = await sequelize.transaction(async (t) => {
      assertNotFutureDate(payload.invoice_date, 'Tanggal invoice')
      if (payload.due_date < payload.invoice_date) {
        throw new BadRequestError('Tanggal jatuh tempo tidak boleh lebih kecil dari tanggal invoice.')
      }
      const scope = await resolveBillingScope(payload, t)
      const serviceType = payload.service_type || 'delivery'
      const customServiceName = serviceType === 'other' ? payload.custom_service_name || null : null
      const effectiveType = effectiveServiceType(serviceType, customServiceName)
      const deliveryPricingMode = resolveDeliveryPricingMode(effectiveType, payload.delivery_pricing_mode)
      const linkedSjUuids = effectiveType === 'rental' ? [] : [...new Set(payload.linked_sj_uuids || [])]

      assertRentalItemsUseFleet(payload.items, effectiveType)
      assertDeliveryItemPricing(payload.items, effectiveType, deliveryPricingMode)
      if ((payload.payment_method || 'transfer') === 'transfer' && !payload.bank_account_id) {
        throw new BadRequestError('Rekening tujuan wajib dipilih untuk metode Transfer Bank.')
      }
      const fleetMap = await resolveItemFleets(payload.items, t)
      const driverMap = await resolveItemDrivers(payload.items, t)
      const invoiceNumber = await generateInvoiceNumber(t)

      // Status awal — sesuai send_immediately flag.
      const initialStatus = payload.send_immediately ? STATUS.SENT : STATUS.DRAFT
      const sentAt        = payload.send_immediately ? new Date()  : null

      // Buat invoice tanpa total dulu, set 0 — akan di-update setelah items dibuat.
      const totals = calcTotals(payload.items, payload.tax_percent, payload.pph_percent, payload.insurance_amount)

      const invoice = await Invoice.create({
        invoice_number:   invoiceNumber,
        idempotency_key:  idempotencyKey,
        idempotency_payload_hash: payloadHash,
        project_id:       scope.projectId,
        customer_id:      scope.customerId,
        invoice_date:     payload.invoice_date,
        due_date:         payload.due_date,
        delivery_date:    effectiveType === 'rental' ? null : (payload.delivery_date || null),
        service_type:     serviceType,
        custom_service_name: customServiceName,
        delivery_pricing_mode: deliveryPricingMode,
        payment_method:   payload.payment_method || 'transfer',
        bank_account_id:  payload.payment_method === 'transfer' ? (payload.bank_account_id || null) : null,
        tax_percent:      payload.tax_percent || 0,
        pph_percent:      payload.pph_percent || 0,
        insurance_amount: round2(Number(payload.insurance_amount) || 0),
        ...totals,
        paid_amount:      0,
        status:           initialStatus,
        notes:            payload.notes || null,
        origin:           effectiveType === 'rental' ? null : payload.origin || null,
        destination:      effectiveType === 'rental' ? null : payload.destination || null,
        cargo_description: effectiveType === 'rental' ? null : payload.cargo_description || null,
        manual_sj_numbers: effectiveType === 'rental' ? null : payload.manual_sj_numbers || null,
        sent_at:          sentAt,
        created_by:       actor?.id || null,
      }, { transaction: t })

      const linkedSjIds = new Set()

      if (linkedSjUuids.length > 0) {
        const sjList = await DeliveryOrder.findAll({
          where:       { uuid: linkedSjUuids },
          transaction: t,
          lock:        t.LOCK.UPDATE,
        })
        if (sjList.length !== linkedSjUuids.length) {
          const found = new Set(sjList.map(sj => sj.uuid))
          const missing = linkedSjUuids.filter(uuid => !found.has(uuid))
          throw new NotFoundError(`SJ tidak ditemukan: ${missing.join(', ')}`)
        }
        for (const sj of sjList) {
          if (!sameBillingScope(invoice, sj)) {
            throw new BadRequestError(`SJ ${sj.sj_number} tidak sesuai dengan scope invoice.`)
          }
          if (!['assigned', 'delivered'].includes(sj.status)) {
            throw new BadRequestError(`SJ ${sj.sj_number} status ${sj.status} — hanya SJ berstatus Terbit atau Terkirim yang bisa dilampirkan.`)
          }
          if (sj.invoice_id && sj.invoice_id !== invoice.id) {
            throw new ConflictError(`SJ ${sj.sj_number} sudah ter-attach ke invoice lain.`)
          }
          linkedSjIds.add(Number(sj.id))
        }

        const firstSj = sjList[0]
        const invoiceRouteUpdates = {}
        if (firstSj) {
          if (!invoice.origin && firstSj.origin) invoiceRouteUpdates.origin = firstSj.origin
          if (!invoice.destination && firstSj.destination) invoiceRouteUpdates.destination = firstSj.destination
          if (!invoice.cargo_description && firstSj.cargo_description) invoiceRouteUpdates.cargo_description = firstSj.cargo_description
        }
        if (Object.keys(invoiceRouteUpdates).length > 0) {
          await invoice.update(invoiceRouteUpdates, { transaction: t })
        }

        await DeliveryOrder.update({
          invoice_id:                invoice.id,
          invoice_attachment_status: 'attached',
        }, {
          where:       { id: sjList.map(sj => sj.id) },
          transaction: t,
        })
      }

      const orphanSourceItem = (payload.items || []).find(item => item.source_sj_id && !linkedSjIds.has(Number(item.source_sj_id)))
      if (orphanSourceItem) {
        throw new BadRequestError('Item invoice dari sumber SJ harus berasal dari SJ yang dilampirkan.')
      }

      const itemRows = buildItemRows(payload.items, invoice.id, fleetMap, driverMap)
      await InvoiceItem.bulkCreate(itemRows, { transaction: t })

      // Optional DP saat create.
      if (payload.down_payment) {
        await upsertDownPayment(invoice, payload.down_payment, actor, t)
      }

      // Auto-create/overwrite SJ dari nomor manual (1 nomor) + tautkan.
      await syncManualSj(invoice, payload, actor, t)

      const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
      return decorate(fresh)
    })

    return { invoice, replayed: false }
  } catch (error) {
    // Dua retry yang tiba bersamaan dapat sama-sama melewati lookup awal.
    // Unique index menjadi pagar terakhir; request yang kalah mengembalikan
    // invoice hasil request pertama setelah transaction pertama commit.
    if (idempotencyKey && isIdempotencyUniqueError(error)) {
      const existing = await findIdempotentInvoice(idempotencyKey, payloadHash, actor)
      if (existing) return { invoice: existing, replayed: true }
    }
    throw error
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────
/**
 * Edit policy: PPN/PPh dan harga per barang/per pengiriman boleh diubah di
 * semua status kecuali void. Struktur item hanya dibuka frontend pada draft/sent.
 * Kalau payload.items dikirim, items lama dihapus dan diganti.
 */
async function update(uuid, payload, actor) {
  let removedLampiranAfterCommit = []
  const result = await sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { uuid }, transaction: t, lock: t.LOCK.UPDATE,
    })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')

    if (payload.invoice_date) assertNotFutureDate(payload.invoice_date, 'Tanggal invoice')

    // Status awal (sebelum mutasi) — dipakai untuk gating settlement_date.
    const wasPaid = invoice.status === STATUS.PAID

    // Edit policy:
    //   - draft: edit penuh
    //   - sent/terbit: metode pembayaran/rekening + DP + rincian item
    //   - semua status non-void: harga per barang/per pengiriman
    //   - outstanding/paid: DP, lampiran, dan PPN/PPh
    //   - void: hanya tanggal invoice (invoice_date)
    // invoice_date (tanggal pembuatan, semua status) & settlement_date (tanggal
    // pelunasan, hanya invoice lunas) ditangani terpisah — keluarkan dari
    // pengecekan policy per-status; nonDateKeys yang menentukan apakah sisa
    // payload diizinkan untuk status invoice ini.
    // customer_id (ganti customer) diizinkan di semua status seperti invoice_date,
    // sehingga tidak ikut membatasi editabilitas field lain per-status. Guard
    // proyek & cascade SJ ditangani di bawah.
    const payloadKeys = Object.keys(payload)
    const policyIgnoredKeys = new Set([
      'invoice_date', 'settlement_date', 'customer_id',
      // Flag kontrol sinkronisasi SJ, bukan field invoice yang diedit.
      'auto_create_sj', 'overwrite_sj_confirmed',
    ])
    const nonDateKeys = payloadKeys.filter(k => !policyIgnoredKeys.has(k))
    // Harga tidak ikut restriction status: draft, sent, outstanding, paid,
    // cancelled/canceled semuanya boleh. VOID tetap ditolak oleh guard di bawah.
    const unrestrictedPricingKeys = new Set(['items', 'delivery_pricing_mode'])
    const statusRestrictedKeys = nonDateKeys.filter(k => !unrestrictedPricingKeys.has(k))
    const isRestrictedStatusEdit = statusRestrictedKeys.every(k =>
      ['down_payment', 'lampiran_paths', 'tax_percent', 'pph_percent'].includes(k)
    )
    const isSentBillingOnly = invoice.status === STATUS.SENT &&
      nonDateKeys.every(k => ['due_date', 'payment_method', 'bank_account_id', 'down_payment', 'items', 'delivery_pricing_mode', 'origin', 'destination', 'cargo_description', 'manual_sj_numbers', 'delivery_date', 'lampiran_paths', 'tax_percent', 'pph_percent', 'insurance_amount'].includes(k))

    if (invoice.status === STATUS.VOID) {
      // Void: satu-satunya perubahan yang diizinkan adalah tanggal invoice.
      if (nonDateKeys.length > 0) {
        throw new ForbiddenError('Invoice void hanya dapat mengubah tanggal invoice.')
      }
    } else if (!isRestrictedStatusEdit && invoice.status !== STATUS.DRAFT && !isSentBillingOnly) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diedit untuk field yang dikirim.`)
    }

    const updates = {}
    const passthrough = ['invoice_date', 'due_date', 'notes', 'payment_method', 'origin', 'destination', 'cargo_description']
    for (const k of passthrough) {
      if (k in payload) updates[k] = payload[k]
    }

    // Ganti customer — hanya untuk invoice tanpa proyek (invoice berproyek
    // customer-nya terikat ke proyek). Bila invoice punya SJ terlampir, customer
    // SJ ikut diubah supaya konsisten. Diizinkan di semua status.
    if ('customer_id' in payload && Number(payload.customer_id) !== Number(invoice.customer_id)) {
      if (invoice.project_id) {
        throw new ForbiddenError('Ganti customer tidak tersedia untuk invoice yang terkait proyek.')
      }
      const nextCustomer = await Customer.findOne({
        where: { id: payload.customer_id }, transaction: t,
      })
      if (!nextCustomer) throw new NotFoundError('Customer tidak ditemukan.')
      updates.customer_id = nextCustomer.id
      // Cascade: samakan customer SJ terlampir dengan customer invoice yang baru.
      await DeliveryOrder.update(
        { customer_id: nextCustomer.id },
        { where: { invoice_id: invoice.id }, transaction: t },
      )
    }

    // Joi hanya cek due_date >= invoice_date kalau keduanya dikirim bersamaan;
    // saat edit hanya due_date, bandingkan dengan invoice_date tersimpan.
    if (updates.due_date) {
      const baseInvoiceDate = updates.invoice_date ?? invoice.invoice_date
      if (baseInvoiceDate && updates.due_date < baseInvoiceDate) {
        throw new BadRequestError('Tanggal jatuh tempo tidak boleh lebih kecil dari tanggal invoice.')
      }
    }

    // Sebaliknya: saat hanya invoice_date yang diubah (mis. invoice paid/void),
    // due_date tidak dikirim sehingga Joi tidak membandingkannya — cek di sini
    // terhadap due_date tersimpan.
    if (updates.invoice_date && !updates.due_date) {
      if (invoice.due_date && updates.invoice_date > invoice.due_date) {
        throw new BadRequestError('Tanggal invoice tidak boleh setelah tanggal jatuh tempo.')
      }
    }

    // Tanggal invoice tidak boleh dimajukan melewati transaksi pembayaran
    // yang sudah tersimpan, termasuk DP.
    if (updates.invoice_date && updates.invoice_date !== invoice.invoice_date) {
      const earliestPayment = await Payment.findOne({
        where: { invoice_id: invoice.id },
        attributes: ['payment_date'],
        order: [['payment_date', 'ASC'], ['id', 'ASC']],
        transaction: t,
      })
      if (earliestPayment && updates.invoice_date > earliestPayment.payment_date) {
        throw new BadRequestError(
          `Tanggal invoice tidak boleh setelah pembayaran pertama (${earliestPayment.payment_date}).`,
        )
      }
    }

    // Nomor SJ manual — hanya relevan untuk jasa non-rental (sama seperti saat create).
    if ('manual_sj_numbers' in payload) {
      const effType = effectiveServiceType(invoice.service_type, invoice.custom_service_name)
      updates.manual_sj_numbers = effType === 'rental' ? null : (payload.manual_sj_numbers || null)
    }

    // Tanggal pengiriman — hanya relevan untuk jasa non-rental.
    if ('delivery_date' in payload) {
      const effType = effectiveServiceType(invoice.service_type, invoice.custom_service_name)
      updates.delivery_date = effType === 'rental' ? null : (payload.delivery_date || null)
    }

    // bank_account_id — hanya relevan jika payment_method transfer
    if ('bank_account_id' in payload || 'payment_method' in payload) {
      const method = updates.payment_method ?? invoice.payment_method
      const nextBankAccountId = method === 'transfer'
        ? (payload.bank_account_id ?? invoice.bank_account_id ?? null)
        : null
      if (method === 'transfer' && !nextBankAccountId) {
        throw new BadRequestError('Rekening tujuan wajib dipilih untuk metode Transfer Bank.')
      }
      updates.bank_account_id = nextBankAccountId
    }

    // lampiran_paths → harus subset dari old (tidak boleh tambah via update).
    if ('lampiran_paths' in payload) {
      const oldPaths = Array.isArray(invoice.lampiran_paths) ? invoice.lampiran_paths : []
      const newArr   = Array.isArray(payload.lampiran_paths) ? payload.lampiran_paths : []
      for (const p of newArr) {
        if (!oldPaths.includes(p)) {
          throw new BadRequestError(
            'Tidak boleh menambah lampiran via update. Pakai endpoint /lampiran untuk upload.',
            { code: 'LAMPIRAN_MUST_USE_UPLOAD_ENDPOINT' },
          )
        }
      }
      updates.lampiran_paths = newArr
      // Kumpulkan dulu; unlink dilakukan SETELAH transaction commit.
      removedLampiranAfterCommit = lampiranSvc.diffRemoved(oldPaths, newArr)
    }

    let nextTaxPercent = invoice.tax_percent
    let nextPphPercent = invoice.pph_percent
    let nextDeliveryPricingMode = invoice.delivery_pricing_mode || DELIVERY_PRICING_MODE.SHIPMENT
    if ('delivery_pricing_mode' in payload) {
      nextDeliveryPricingMode = resolveDeliveryPricingMode(effectiveServiceType(invoice.service_type, invoice.custom_service_name), payload.delivery_pricing_mode)
      updates.delivery_pricing_mode = nextDeliveryPricingMode
    }
    if ('tax_percent' in payload) {
      nextTaxPercent = payload.tax_percent
      updates.tax_percent = payload.tax_percent
    }
    if ('pph_percent' in payload) {
      nextPphPercent = payload.pph_percent
      updates.pph_percent = payload.pph_percent
    }
    if ('insurance_amount' in payload) updates.insurance_amount = round2(Number(payload.insurance_amount) || 0)

    let itemRowsForRecalc = null

    if (payload.items) {
      itemRowsForRecalc = await replaceInvoiceItems(invoice, payload.items, t)
    }

    if (payload.items || 'delivery_pricing_mode' in payload) {
      const itemsForPricingValidation = itemRowsForRecalc
        ? itemRowsForRecalc
        : await InvoiceItem.findAll({
            where: { invoice_id: invoice.id },
            transaction: t,
          })
      assertDeliveryItemPricing(itemsForPricingValidation, effectiveServiceType(invoice.service_type, invoice.custom_service_name), nextDeliveryPricingMode)
    }

    // Recalc total kalau items / tax / pph / insurance berubah
    if (payload.items || 'tax_percent' in payload || 'pph_percent' in payload || 'insurance_amount' in payload) {
      const items = itemRowsForRecalc
        ? itemRowsForRecalc.map(r => ({ qty: r.qty, unit_price: r.unit_price }))
        : await InvoiceItem.findAll({
            where: { invoice_id: invoice.id },
            transaction: t,
          }).then(rows => rows.map(r => ({ qty: r.qty, unit_price: r.unit_price })))

      const nextInsurance = 'insurance_amount' in payload ? round2(Number(payload.insurance_amount) || 0) : round2(Number(invoice.insurance_amount) || 0)
      const newTotals = calcTotals(items, nextTaxPercent, nextPphPercent, nextInsurance)
      Object.assign(updates, newTotals)

      // Jika total dan DP diubah bersamaan, validasi terhadap nominal akhir
      // setelah perubahan DP. Ini menghindari penolakan keliru saat user sedang
      // menurunkan DP agar sesuai dengan total invoice baru.
      const currentPaid = round2(invoice.paid_amount || 0)
      let paidAmountAfterUpdate = currentPaid
      if ('down_payment' in payload) {
        const regularPaid = await Payment.sum('amount', {
          where: { invoice_id: invoice.id, is_down_payment: false },
          transaction: t,
        })
        paidAmountAfterUpdate = calculatePaidAmountAfterDownPaymentChange(
          currentPaid,
          regularPaid || 0,
          payload.down_payment,
        )
      }
      if (paidAmountAfterUpdate > round2(newTotals.total_amount) + 0.001) {
        throw new BadRequestError(
          `Total invoice baru (Rp ${newTotals.total_amount.toLocaleString('id-ID')}) lebih kecil dari total pembayaran akhir (Rp ${paidAmountAfterUpdate.toLocaleString('id-ID')}). ` +
          `Hapus/turunkan DP atau pembayaran dulu sebelum mengubah items/pajak.`,
          { code: 'TOTAL_BELOW_PAID' },
        )
      }
      // Bila pajak dinaikkan pada invoice lunas, pembayaran yang sudah tercatat
      // bisa menjadi kurang dari total baru. Kembalikan status ke outstanding.
      if (invoice.status === STATUS.PAID && paidAmountAfterUpdate + 0.001 < round2(newTotals.total_amount)) {
        updates.status = STATUS.OUTSTANDING
        updates.settlement_date = null
      }
    }

    if (Object.keys(updates).length > 0) {
      await invoice.update(updates, { transaction: t })
    }

    // DP upsert/clear — dipanggil SETELAH update invoice (terutama total_amount)
    // supaya validasi DP <= total dijalankan terhadap total terbaru.
    if ('down_payment' in payload) {
      // Refetch invoice untuk dapat total_amount yang baru.
      await invoice.reload({ transaction: t })
      await upsertDownPayment(invoice, payload.down_payment, actor, t)
    }

    // Tanggal pelunasan — hanya untuk invoice yang (sejak awal) lunas. Ubah
    // payment_date pembayaran pelunas, yaitu payment dengan tanggal TERBARU
    // (reguler + DP) — konsisten dengan getSettlementDate() di frontend.
    // Dijalankan paling akhir supaya tidak ditimpa upsert DP.
    if ('settlement_date' in payload) {
      if (!wasPaid) {
        throw new BadRequestError('Tanggal pelunasan hanya bisa diubah untuk invoice yang sudah lunas.')
      }
      if (updates.status === STATUS.OUTSTANDING) {
        throw new BadRequestError('Tanggal pelunasan tidak dapat diubah karena total baru membuat invoice kembali outstanding.')
      }
      const newDate = payload.settlement_date
      assertNotFutureDate(newDate, 'Tanggal pelunasan')
      if (newDate < invoice.invoice_date) {
        throw new BadRequestError('Tanggal pelunasan tidak boleh sebelum tanggal invoice.')
      }
      const payments = await Payment.findAll({ where: { invoice_id: invoice.id }, transaction: t })
      if (payments.length === 0) {
        throw new BadRequestError('Tidak ada pembayaran yang bisa diubah tanggal pelunasannya.')
      }
      // Pembayaran pelunas = payment_date terbaru (tie → id terbesar/paling akhir).
      const settling = payments.reduce((latest, p) => {
        const a = p.payment_date
        const b = latest.payment_date
        if (a > b) return p
        if (a === b && p.id > latest.id) return p
        return latest
      }, payments[0])
      const laterOtherPayment = payments.find(p => p.id !== settling.id && p.payment_date > newDate)
      if (laterOtherPayment) {
        throw new BadRequestError(
          `Tanggal pelunasan tidak boleh sebelum pembayaran lain (${laterOtherPayment.payment_date}).`,
        )
      }
      await settling.update({ payment_date: newDate }, { transaction: t })
      await invoice.update({ settlement_date: newDate }, { transaction: t })
    }

    // Auto-create/overwrite SJ dari nomor manual — hanya saat edit menyentuh
    // konten SJ (items atau nomor manual), bukan pada edit tanggal/pembayaran saja.
    if ('items' in payload || 'manual_sj_numbers' in payload) {
      await invoice.reload({ transaction: t })
      await syncManualSj(invoice, payload, actor, t)
    }

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
  // Hapus file orphan hanya setelah transaction berhasil commit.
  for (const p of removedLampiranAfterCommit) lampiranSvc.safeUnlink(p)
  return result
}

// ── STATE TRANSITIONS ─────────────────────────────────────────────────────
async function send(uuid, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (!canTransition(invoice.status, STATUS.SENT)) {
      throw new ConflictError(`Tidak bisa send dari status ${invoice.status}.`)
    }
    await invoice.update({
      status:  STATUS.SENT,
      sent_at: invoice.sent_at || new Date(),
    }, { transaction: t })
    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

async function markOutstanding(uuid, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (!canTransition(invoice.status, STATUS.OUTSTANDING)) {
      throw new ConflictError(`Tidak bisa mark outstanding dari status ${invoice.status}.`)
    }
    await invoice.update({ status: STATUS.OUTSTANDING }, { transaction: t })
    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

async function voidInvoice(uuid, payload, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (!canTransition(invoice.status, STATUS.VOID)) {
      throw new ConflictError(`Tidak bisa void dari status ${invoice.status}.`)
    }

    // Block kalau sudah ada Payment dengan amount > 0.
    const payments = await Payment.findAll({
      where: { invoice_id: invoice.id },
      transaction: t,
    })
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    if (totalPaid > 0) {
      throw new ConflictError(
        'Invoice memiliki pembayaran tercatat. Hapus pembayaran terlebih dulu sebelum void.',
        { code: 'INVOICE_HAS_PAYMENT' },
      )
    }

    // Detach semua SJ yang ter-attach: clear invoice_id + reset attachment status.
    await DeliveryOrder.update({
      invoice_id:                null,
      invoice_attachment_status: 'no_invoice',
    }, {
      where:       { invoice_id: invoice.id },
      transaction: t,
    })

    await invoice.update({
      status:      STATUS.VOID,
      void_reason: payload.void_reason,
    }, { transaction: t })

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

/**
 * Batalkan status lunas — kembalikan invoice PAID ke SENT (terbit) supaya bisa
 * diedit lagi. Hapus semua pembayaran REGULER (non-DP); DP dipertahankan.
 * paid_amount dihitung ulang = total DP tersisa (0 kalau tak ada DP).
 */
async function revertToUnpaid(uuid, payload, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (invoice.status !== STATUS.PAID) {
      throw new ConflictError(`Hanya invoice lunas yang bisa dibatalkan status lunasnya (status sekarang: ${invoice.status}).`)
    }

    const allPayments = await Payment.findAll({
      where: { invoice_id: invoice.id },
      transaction: t,
    })
    // DP = payment dengan is_down_payment === true (sama seperti decorate()).
    const regularIds = allPayments.filter(p => p.is_down_payment !== true).map(p => p.id)
    if (regularIds.length > 0) {
      await Payment.destroy({ where: { id: regularIds }, transaction: t })
    }
    const dpTotal = round2(
      allPayments
        .filter(p => p.is_down_payment === true)
        .reduce((s, p) => s + Number(p.amount || 0), 0),
    )

    await invoice.update({
      status:      STATUS.SENT,
      paid_amount: dpTotal,
      settlement_date: null,
      // Invoice yang pernah lunas pasti sudah terbit; jaga-jaga jika sent_at
      // belum terisi (mis. jalur draft→outstanding→paid).
      sent_at:     invoice.sent_at || new Date(),
    }, { transaction: t })

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

// ── PAYMENT ───────────────────────────────────────────────────────────────
async function recordPayment(invoiceUuid, payload, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if ([STATUS.DRAFT, STATUS.PAID, STATUS.VOID].includes(invoice.status)) {
      throw new ConflictError(
        `Tidak bisa mencatat pembayaran untuk invoice status ${invoice.status}.`,
      )
    }

    await assertRegularPaymentDate(invoice, payload.payment_date, t)

    const total     = Number(invoice.total_amount || 0)
    const paid      = Number(invoice.paid_amount  || 0)
    const remaining = calculateRemainingAmount(total, paid)
    const amount    = round2(payload.amount)

    if (amount > remaining + 0.001) {
      throw new BadRequestError(
        `Nominal pembayaran melebihi sisa tagihan (Rp ${remaining.toLocaleString('id-ID')}).`,
      )
    }

    await Payment.create({
      invoice_id:   invoice.id,
      payment_date: payload.payment_date,
      amount,
      method:       payload.method,
      proof_path:   payload.proof_path || null,
      notes:        payload.notes || null,
      created_by:   actor?.id || null,
    }, { transaction: t })

    const newPaid = round2(paid + amount)
    const updates = { paid_amount: newPaid }

    // Auto-transition outstanding → paid kalau lunas.
    if (newPaid >= total && total > 0) {
      updates.status = STATUS.PAID
      updates.settlement_date = payload.payment_date
    } else if (invoice.status === STATUS.SENT) {
      // Kalau ada payment masuk pada status sent, tidak otomatis pindah outstanding —
      // outstanding adalah pilihan manual user. Status tetap.
    }

    await invoice.update(updates, { transaction: t })
    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

/** Catat pelunasan beberapa invoice secara atomik dalam satu transaksi. */
async function recordBulkPayments(payload, actor) {
  return sequelize.transaction(async (t) => {
    const entries = payload.payments
    const uuids = entries.map(entry => entry.invoice_uuid)
    const invoices = await Invoice.findAll({
      where: { uuid: { [Op.in]: uuids } },
      order: [['id', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    })
    if (invoices.length !== uuids.length) {
      const found = new Set(invoices.map(invoice => invoice.uuid))
      const missing = uuids.filter(uuid => !found.has(uuid))
      throw new NotFoundError(`Invoice tidak ditemukan: ${missing.join(', ')}`)
    }

    const invoiceByUuid = new Map(invoices.map(invoice => [invoice.uuid, invoice]))
    const results = []
    for (const entry of entries) {
      const invoice = invoiceByUuid.get(entry.invoice_uuid)
      if ([STATUS.DRAFT, STATUS.PAID, STATUS.VOID].includes(invoice.status)) {
        throw new ConflictError(
          `Invoice ${invoice.invoice_number} tidak dapat dilunasi dari status ${invoice.status}.`,
        )
      }
      await assertRegularPaymentDate(invoice, payload.payment_date, t)

      const total = round2(invoice.total_amount)
      const paid = round2(invoice.paid_amount)
      const remaining = calculateRemainingAmount(total, paid)
      if (remaining <= 0) {
        throw new ConflictError(`Invoice ${invoice.invoice_number} tidak memiliki sisa tagihan.`)
      }

      await Payment.create({
        invoice_id: invoice.id,
        payment_date: payload.payment_date,
        amount: remaining,
        method: entry.method,
        proof_path: null,
        notes: payload.notes || 'Pembayaran pelunasan',
        created_by: actor?.id || null,
      }, { transaction: t })

      await invoice.update({
        paid_amount: total,
        status: STATUS.PAID,
        settlement_date: payload.payment_date,
      }, { transaction: t })
      results.push(invoice.uuid)
    }

    const freshInvoices = []
    for (const uuid of results) {
      freshInvoices.push(decorate(await repo.findByUuid(uuid, { transaction: t })))
    }
    return freshInvoices
  })
}

// ── ATTACH / DETACH SJ ────────────────────────────────────────────────────
/**
 * Attach beberapa SJ ke invoice. Validasi:
 *  - Invoice project: SJ project_id harus sama
 *  - Invoice customer-only: SJ juga customer-only dan customer_id harus sama
 *  - SJ status harus assigned atau delivered (draft dan void tidak bisa)
 *  - SJ belum punya invoice_id (belum attached ke invoice lain)
 */
async function attachSJ(invoiceUuid, sjUuids, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah attachment-nya.`)
    }
    if (effectiveServiceType(invoice.service_type, invoice.custom_service_name) === 'rental') {
      throw new ForbiddenError('Invoice jasa penyewaan tidak dapat dikaitkan dengan Surat Jalan.')
    }

    // Fetch SJ dengan Fleet untuk fleet_label
    const sjList = await DeliveryOrder.findAll({
      where:       { uuid: sjUuids },
      include:     [{ model: Fleet, as: 'fleet', attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd'], required: false }],
      transaction: t,
    })

    if (sjList.length !== sjUuids.length) {
      const found   = new Set(sjList.map(sj => sj.uuid))
      const missing = sjUuids.filter(u => !found.has(u))
      throw new NotFoundError(`SJ tidak ditemukan: ${missing.join(', ')}`)
    }

    for (const sj of sjList) {
      if (!sameBillingScope(invoice, sj)) {
        throw new BadRequestError(`SJ ${sj.sj_number} tidak sesuai dengan scope invoice.`)
      }
      if (!['assigned', 'delivered'].includes(sj.status)) {
        throw new BadRequestError(`SJ ${sj.sj_number} status ${sj.status} — hanya SJ berstatus Terbit atau Terkirim yang bisa dilampirkan.`)
      }
      if (sj.invoice_id && sj.invoice_id !== invoice.id) {
        throw new ConflictError(`SJ ${sj.sj_number} sudah ter-attach ke invoice lain.`)
      }
    }

    // Filter SJ yang belum ter-attach ke invoice ini (idempotent)
    const sjToProcess = sjList.filter(sj => sj.invoice_id !== invoice.id)

    const firstSj = sjToProcess[0]
    const invoiceRouteUpdates = {}
    if (firstSj) {
      if (!invoice.origin && firstSj.origin) invoiceRouteUpdates.origin = firstSj.origin
      if (!invoice.destination && firstSj.destination) invoiceRouteUpdates.destination = firstSj.destination
      if (!invoice.cargo_description && firstSj.cargo_description) invoiceRouteUpdates.cargo_description = firstSj.cargo_description
    }
    if (Object.keys(invoiceRouteUpdates).length > 0) {
      await invoice.update(invoiceRouteUpdates, { transaction: t })
    }

    // Update delivery_orders
    await DeliveryOrder.update({
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
    }, {
      where:       { id: sjToProcess.map(sj => sj.id) },
      transaction: t,
    })

    // Salin items dari SJ ke invoice_items
    const existingCount = await InvoiceItem.count({ where: { invoice_id: invoice.id }, transaction: t })
    let globalIndex = existingCount

    const allNewRows = []
    for (const sj of sjToProcess) {
      const rows = buildSJItemRows(sj, invoice.id, globalIndex)
      allNewRows.push(...rows)
      globalIndex += rows.length
    }

    if (allNewRows.length > 0) {
      await InvoiceItem.bulkCreate(allNewRows, { transaction: t })
      await recalcInvoiceTotals(invoice, t)
    }

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

async function detachSJ(invoiceUuid, sjUuid, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah attachment-nya.`)
    }

    const sj = await DeliveryOrder.findOne({ where: { uuid: sjUuid }, transaction: t })
    if (!sj)                          throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (sj.invoice_id !== invoice.id) throw new BadRequestError('SJ ini tidak ter-attach ke invoice tersebut.')

    // Hapus items yang berasal dari SJ ini
    const deletedCount = await InvoiceItem.destroy({
      where:       { invoice_id: invoice.id, source_sj_id: sj.id },
      transaction: t,
    })

    // Recalc total hanya kalau ada item yang dihapus
    if (deletedCount > 0) {
      await recalcInvoiceTotals(invoice, t)
    }

    await sj.update({
      invoice_id:                null,
      invoice_attachment_status: 'no_invoice',
    }, { transaction: t })

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

/**
 * List SJ yang bisa di-attach ke invoice tertentu:
 *  - Invoice project: project_id sama dengan invoice
 *  - Invoice customer-only: customer_id sama dan project_id null
 *  - status = assigned atau delivered
 *  - belum punya invoice_id
 */
async function getAttachableSJ(invoiceUuid) {
  const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid } })
  if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
  if (effectiveServiceType(invoice.service_type, invoice.custom_service_name) === 'rental') return []

  const rows = await DeliveryOrder.findAll({
    where: {
      ...(invoice.project_id
        ? { project_id: invoice.project_id }
        : { project_id: null, customer_id: invoice.customer_id }),
      status:     { [require('sequelize').Op.in]: ['assigned', 'delivered'] },
      invoice_id: null,
    },
    include: [
      { model: Fleet,  as: 'fleet',  attributes: ['id', 'uuid', 'name', 'plate_number'] },
      { model: require('../models').Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
    ],
    order: [['sj_date', 'ASC']],
  })
  return rows
}

// ── LAMPIRAN ──────────────────────────────────────────────────────────────
async function addLampiran(uuid, savedPath, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { uuid }, transaction: t, lock: t.LOCK.UPDATE,
    })
    if (!invoice) {
      lampiranSvc.safeUnlink(savedPath)
      throw new NotFoundError('Invoice tidak ditemukan.')
    }
    if (invoice.status === STATUS.VOID) {
      lampiranSvc.safeUnlink(savedPath)
      throw new ForbiddenError('Invoice yang sudah void tidak dapat diubah lampirannya.')
    }
    let nextPaths
    try {
      nextPaths = lampiranSvc.appendLampiranPath(invoice.lampiran_paths, savedPath)
    } catch (err) {
      lampiranSvc.safeUnlink(savedPath)
      throw err
    }
    await invoice.update({ lampiran_paths: nextPaths }, { transaction: t })
    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

async function removeLampiran(uuid, targetPath, actor) {
  const result = await sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { uuid }, transaction: t, lock: t.LOCK.UPDATE,
    })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (invoice.status === STATUS.VOID) {
      throw new ForbiddenError('Invoice yang sudah void tidak dapat diubah lampirannya.')
    }
    const nextPaths = lampiranSvc.removeLampiranPath(invoice.lampiran_paths, targetPath)
    await invoice.update({ lampiran_paths: nextPaths }, { transaction: t })
    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
  // Hapus file hanya setelah DB commit berhasil.
  lampiranSvc.safeUnlink(targetPath)
  return result
}

async function resolveLampiranDownload(uuid, filename) {
  const invoice = await Invoice.findOne({ where: { uuid } })
  if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')

  const found = (invoice.lampiran_paths || []).find(p => {
    const base = p.split('/').pop()
    return base === filename
  })
  if (!found) throw new NotFoundError('Lampiran tidak ditemukan di invoice ini.')

  const abs = lampiranSvc.resolveAbsolute(found)
  const fs  = require('fs')
  if (!fs.existsSync(abs)) {
    throw new NotFoundError('File lampiran tidak ditemukan di server.')
  }
  return { absPath: abs, relativePath: found, filename: found.split('/').pop() }
}

module.exports = {
  STATUS,
  ALLOWED_TRANSITIONS,
  canTransition,
  list,
  getSummaryStats,
  getByUuid,
  create,
  update,
  send,
  markOutstanding,
  voidInvoice,
  revertToUnpaid,
  recordPayment,
  recordBulkPayments,
  attachSJ,
  detachSJ,
  getAttachableSJ,
  addLampiran,
  removeLampiran,
  resolveLampiranDownload,
}
