'use strict'

const {
  sequelize,
  Invoice,
  InvoiceItem,
  Payment,
  Project,
  Customer,
  Fleet,
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

const STATUS = {
  DRAFT:       'draft',
  SENT:        'sent',
  OUTSTANDING: 'outstanding',
  PAID:        'paid',
  VOID:        'void',
}

const ALLOWED_TRANSITIONS = {
  [STATUS.DRAFT]:       [STATUS.SENT, STATUS.OUTSTANDING, STATUS.VOID],
  [STATUS.SENT]:        [STATUS.OUTSTANDING, STATUS.VOID],
  [STATUS.OUTSTANDING]: [STATUS.PAID, STATUS.VOID],
  [STATUS.PAID]:        [],
  [STATUS.VOID]:        [],
}

function canTransition(current, next) {
  return (ALLOWED_TRANSITIONS[current] || []).includes(next)
}

const FINAL_STATUSES = [STATUS.PAID, STATUS.VOID]

function periodToRange(period) {
  if (!period || period === 'all') return null
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const day   = now.getDate()

  switch (period) {
    case 'today': {
      const d = new Date(year, month, day)
      return { from: d, to: new Date(year, month, day, 23, 59, 59) }
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { from: d, to: now }
    }
    case 'month': {
      return {
        from: new Date(year, month, 1),
        to:   new Date(year, month + 1, 0, 23, 59, 59),
      }
    }
    case 'last_month': {
      return {
        from: new Date(year, month - 1, 1),
        to:   new Date(year, month, 0, 23, 59, 59),
      }
    }
    default:
      return null
  }
}

// ── HELPER: hitung total invoice dari list items + tax/pph percent ────────
function calcTotals(items, taxPercent, pphPercent) {
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0),
    0,
  )
  const taxAmount = subtotal * Number(taxPercent || 0) / 100
  const pphAmount = subtotal * Number(pphPercent || 0) / 100
  const total     = subtotal + taxAmount - pphAmount
  return {
    subtotal_amount: round2(subtotal),
    tax_amount:      round2(taxAmount),
    pph_amount:      round2(pphAmount),
    total_amount:    round2(total),
  }
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100
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

  plain.down_payment        = dpRow
  plain.down_payment_amount = dpRow ? round2(dpRow.amount) : 0
  plain.has_down_payment    = !!dpRow
  plain.remaining_amount    = round2(Math.max(0, total - paid))
  plain.payments            = regularPayments

  return plain
}

async function resolveProjectRef(payload, t) {
  const where = payload.project_uuid
    ? { uuid: payload.project_uuid }
    : { id: payload.project_id }
  const project = await Project.findOne({ where, transaction: t })
  if (!project) throw new NotFoundError('Project tidak ditemukan.')
  return project
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
    attributes: ['id', 'uuid'],
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
  return { byUuid, byId }
}

function buildItemRows(items, invoiceId, fleetMap) {
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
      fleet_label:   it.fleet_label,
      description:   it.description || null,
      period_start:  it.period_start || null,
      period_end:    it.period_end   || null,
      qty,
      unit:          it.unit || 'Unit',
      unit_price:    unitPrice,
      subtotal:      round2(qty * unitPrice),
      sort_order:    it.sort_order ?? 0,
    }
  })
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
    const qty       = Number(item.qty)       || 1
    const unitPrice = Number(item.unit_price) || 0
    return {
      invoice_id:   invoiceId,
      fleet_id:     fleetIsTbd ? null : sj.fleet_id,
      fleet_label:  fleetLabel,
      description:  item.description || null,
      period_start: null,
      period_end:   null,
      qty,
      unit:         item.unit || 'Unit',
      unit_price:   unitPrice,
      subtotal:     round2(qty * unitPrice),
      sort_order:   startOrder + i,
      source_sj_id: sj.id,
    }
  })
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
  const totals = calcTotals(plain, invoice.tax_percent, invoice.pph_percent)
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
      plain.remaining_amount = round2(Math.max(0, total - paid))
      plain.has_down_payment = dpInvoiceIds.has(Number(plain.id))
      return plain
    }),
    count,
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
    attributes: ['amount'],
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
    }
    await invoice.update(updates, { transaction: t })
    return
  }

  // Upsert DP.
  const dpAmount = round2(dp.amount)

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
  const newPaid = round2(regularPaid + dpAmount)
  const updates = { paid_amount: newPaid }
  if (invoice.status === STATUS.PAID && newPaid < round2(invoice.total_amount || 0)) {
    updates.status = STATUS.OUTSTANDING
  }
  await invoice.update(updates, { transaction: t })
}

// ── CREATE ────────────────────────────────────────────────────────────────
async function create(payload, actor) {
  return sequelize.transaction(async (t) => {
    const project = await resolveProjectRef(payload, t)

    const fleetMap = await resolveItemFleets(payload.items, t)
    const invoiceNumber = await generateInvoiceNumber(t)

    // Status awal — sesuai send_immediately flag.
    const initialStatus = payload.send_immediately ? STATUS.SENT : STATUS.DRAFT
    const sentAt        = payload.send_immediately ? new Date()  : null

    // Buat invoice tanpa total dulu, set 0 — akan di-update setelah items dibuat.
    const totals = calcTotals(payload.items, payload.tax_percent, payload.pph_percent)

    const invoice = await Invoice.create({
      invoice_number:   invoiceNumber,
      project_id:       project.id,
      customer_id:      project.customer_id,
      invoice_date:     payload.invoice_date,
      due_date:         payload.due_date,
      payment_method:   payload.payment_method || 'transfer',
      bank_account_id:  payload.payment_method === 'transfer' ? (payload.bank_account_id || null) : null,
      tax_percent:      payload.tax_percent || 0,
      pph_percent:      payload.pph_percent || 0,
      ...totals,
      paid_amount:      0,
      status:           initialStatus,
      notes:            payload.notes || null,
      sent_at:          sentAt,
      created_by:       actor?.id || null,
    }, { transaction: t })

    const itemRows = buildItemRows(payload.items, invoice.id, fleetMap)
    await InvoiceItem.bulkCreate(itemRows, { transaction: t })

    // Optional DP saat create.
    if (payload.down_payment) {
      await upsertDownPayment(invoice, payload.down_payment, actor, t)
    }

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

// ── UPDATE ────────────────────────────────────────────────────────────────
/**
 * Edit policy: items boleh diubah kapan saja kecuali status paid/void.
 * Kalau payload.items dikirim, items lama dihapus dan diganti.
 */
async function update(uuid, payload, actor) {
  let removedLampiranAfterCommit = []
  const result = await sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { uuid }, transaction: t, lock: t.LOCK.UPDATE,
    })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')

    // DP edit policy lebih longgar dari edit invoice umum:
    //   - DP boleh diedit di semua status KECUALI void
    //   - Field invoice lain (items/tax/dst) hanya boleh di-edit di non-final
    //
    // Kalau payload HANYA berisi `down_payment` → bypass FINAL_STATUSES check.
    const isDpOnly = Object.keys(payload).every(k => k === 'down_payment')

    if (invoice.status === STATUS.VOID) {
      throw new ForbiddenError('Invoice void tidak dapat diedit.')
    }
    if (!isDpOnly && FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diedit.`)
    }

    const updates = {}
    const passthrough = ['invoice_date', 'due_date', 'notes', 'payment_method']
    for (const k of passthrough) {
      if (k in payload) updates[k] = payload[k]
    }

    // bank_account_id — hanya relevan jika payment_method transfer
    if ('bank_account_id' in payload || 'payment_method' in payload) {
      const method = updates.payment_method ?? invoice.payment_method
      updates.bank_account_id = method === 'transfer' ? (payload.bank_account_id ?? null) : null
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
    if ('tax_percent' in payload) {
      nextTaxPercent = payload.tax_percent
      updates.tax_percent = payload.tax_percent
    }
    if ('pph_percent' in payload) {
      nextPphPercent = payload.pph_percent
      updates.pph_percent = payload.pph_percent
    }

    let itemRowsForRecalc = null

    if (payload.items) {
      const fleetMap = await resolveItemFleets(payload.items, t)
      // Replace seluruh items
      await InvoiceItem.destroy({ where: { invoice_id: invoice.id }, transaction: t })
      const itemRows = buildItemRows(payload.items, invoice.id, fleetMap)
      await InvoiceItem.bulkCreate(itemRows, { transaction: t })
      itemRowsForRecalc = itemRows
    }

    // Recalc total kalau items / tax / pph berubah
    if (payload.items || 'tax_percent' in payload || 'pph_percent' in payload) {
      const items = itemRowsForRecalc
        ? itemRowsForRecalc.map(r => ({ qty: r.qty, unit_price: r.unit_price }))
        : await InvoiceItem.findAll({
            where: { invoice_id: invoice.id },
            transaction: t,
          }).then(rows => rows.map(r => ({ qty: r.qty, unit_price: r.unit_price })))

      const newTotals = calcTotals(items, nextTaxPercent, nextPphPercent)
      Object.assign(updates, newTotals)

      // Guard: kalau total baru < paid_amount existing (DP + payments) →
      // user harus revisi DP/payment dulu sebelum bisa potong total.
      const currentPaid = round2(invoice.paid_amount || 0)
      if (currentPaid > round2(newTotals.total_amount) + 0.001) {
        throw new BadRequestError(
          `Total invoice baru (Rp ${newTotals.total_amount.toLocaleString('id-ID')}) lebih kecil dari total pembayaran tercatat (Rp ${currentPaid.toLocaleString('id-ID')}). ` +
          `Hapus/turunkan DP atau pembayaran dulu sebelum mengubah items/pajak.`,
          { code: 'TOTAL_BELOW_PAID' },
        )
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

    const total     = Number(invoice.total_amount || 0)
    const paid      = Number(invoice.paid_amount  || 0)
    const remaining = round2(Math.max(0, total - paid))
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
    } else if (invoice.status === STATUS.SENT) {
      // Kalau ada payment masuk pada status sent, tidak otomatis pindah outstanding —
      // outstanding adalah pilihan manual user. Status tetap.
    }

    await invoice.update(updates, { transaction: t })
    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}

// ── ATTACH / DETACH SJ ────────────────────────────────────────────────────
/**
 * Attach beberapa SJ ke invoice. Validasi:
 *  - SJ project_id harus sama dengan invoice.project_id
 *  - SJ status harus delivered
 *  - SJ belum punya invoice_id (belum attached ke invoice lain)
 */
async function attachSJ(invoiceUuid, sjUuids, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah attachment-nya.`)
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
      if (sj.project_id !== invoice.project_id) {
        throw new BadRequestError(`SJ ${sj.sj_number} bukan dari project yang sama dengan invoice.`)
      }
      if (sj.status !== 'delivered') {
        throw new BadRequestError(`SJ ${sj.sj_number} status ${sj.status} — hanya SJ delivered yang bisa di-attach.`)
      }
      if (sj.invoice_id && sj.invoice_id !== invoice.id) {
        throw new ConflictError(`SJ ${sj.sj_number} sudah ter-attach ke invoice lain.`)
      }
    }

    // Update delivery_orders
    await DeliveryOrder.update({
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
    }, {
      where:       { id: sjList.map(sj => sj.id) },
      transaction: t,
    })

    // Salin items dari SJ ke invoice_items
    const existingCount = await InvoiceItem.count({ where: { invoice_id: invoice.id }, transaction: t })
    let globalIndex = existingCount

    const allNewRows = []
    for (const sj of sjList) {
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
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t })
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
 *  - project_id sama dengan invoice
 *  - status = delivered
 *  - belum punya invoice_id
 */
async function getAttachableSJ(invoiceUuid) {
  const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid } })
  if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')

  const rows = await DeliveryOrder.findAll({
    where: {
      project_id: invoice.project_id,
      status:     'delivered',
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
    if (FINAL_STATUSES.includes(invoice.status)) {
      lampiranSvc.safeUnlink(savedPath)
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah lampirannya.`)
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
    if (FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah lampirannya.`)
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
  getByUuid,
  create,
  update,
  send,
  markOutstanding,
  voidInvoice,
  recordPayment,
  attachSJ,
  detachSJ,
  getAttachableSJ,
  addLampiran,
  removeLampiran,
  resolveLampiranDownload,
}
