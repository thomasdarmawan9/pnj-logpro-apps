'use strict'

const path = require('path')
const ExcelJS = require('exceljs')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const {
  sequelize,
  Customer,
  Fleet,
  Invoice,
  InvoiceItem,
  Payment,
} = require('../src/models')

const WORKBOOK_PATH = '/Users/thomasdarmawan/Downloads/LIST INVOICE DAN PEMBAYARAN.xlsx'
const IMPORTS = [
  {
    sheetName: 'YAYASAN GEREJA METHODIST',
    customerName: 'YAYASAN GEREJA METHODIST INDONESIA',
  },
  {
    sheetName: 'PT. AT',
    customerName: 'PT. AT',
  },
  {
    sheetName: 'PT. EQUIPINDO PERKASA',
    customerName: 'PT. EQUIPINDO PERKASA',
  },
  {
    sheetName: 'PT. BORNEO MARINE NUSANTARA',
    customerName: 'PT. BORNEO MARINE NUSANTARA',
  },
]

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return `${value.getFullYear()}-${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}`
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function numericValue(value) {
  if (value === null || value === undefined || value === '') return 0
  if (value instanceof Date) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value.result !== undefined) return numericValue(value.result)
  const normalized = String(value).replace(/[^\d.-]/g, '')
  return normalized ? Number(normalized) : 0
}

function textValue(value) {
  if (value === null || value === undefined || value instanceof Date) return ''
  if (typeof value === 'object' && value.text) return String(value.text).trim()
  if (typeof value === 'object' && value.richText) return value.richText.map((part) => part.text).join('').trim()
  return String(value).trim()
}

function isOwnCellValue(cell) {
  return !cell.isMerged || cell.master.address === cell.address
}

function percent(amount, subtotal) {
  if (!subtotal || !amount) return 0
  return Math.round((amount / subtotal * 100) * 100) / 100
}

function normalizeSheetName(value) {
  return String(value || '').toUpperCase().replace(/[\s.]/g, '')
}

function findSheet(workbook, sheetName) {
  return workbook.getWorksheet(sheetName)
    || workbook.worksheets.find((sheet) => normalizeSheetName(sheet.name) === normalizeSheetName(sheetName))
    || workbook.worksheets.find((sheet) => normalizeSheetName(sheet.name).includes(normalizeSheetName(sheetName)))
}

function extractPlateNumber(description) {
  const match = String(description || '').toUpperCase().match(/\b(AG|KB|BK|B|BE|KH|BM|M|N)\s*(\d{3,4})\s*([A-Z]{2,3})\b/)
  if (!match) return null
  return `${match[1]} ${match[2]} ${match[3]}`
}

function inferFleetName(description) {
  const text = String(description || '').toLowerCase()
  if (/innova|zenix|alphard|alpard|avanza|hilux|fortuner|mobil/.test(text)) return { name: 'Mobil', category: 'family_car' }
  if (/crane|compactor|vibro|excavator|loader|alat berat/.test(text)) return { name: 'Alat Berat', category: 'heavy_equipment' }
  if (/trailer/.test(text)) return { name: 'Trailer', category: 'trailer' }
  return { name: 'Truck', category: 'truck' }
}

function readAmounts(row) {
  const totalInvoice = numericValue(row.getCell(4).value)
  const dpp = numericValue(row.getCell(5).value)
  const ppn = numericValue(row.getCell(6).value)
  const pph = numericValue(row.getCell(7).value)
  const netTotal = numericValue(row.getCell(8).value)
  const subtotal = dpp || totalInvoice || netTotal
  const total = netTotal || totalInvoice || dpp

  return {
    subtotal,
    taxAmount: ppn,
    pphAmount: pph,
    total,
  }
}

function inferServiceType(description) {
  return /\bsewa\b|penyewaan|rental/i.test(String(description || '')) ? 'rental' : 'delivery'
}

function inferRentalLabel(description) {
  const text = String(description || '')
  if (/innova|zenix/i.test(text)) return 'Innova Zenix'
  if (/alphard|alpard/i.test(text)) return 'Alphard'
  if (/avanza/i.test(text)) return 'Avanza'
  if (/hilux/i.test(text)) return 'Hilux'
  if (/fortuner/i.test(text)) return 'Fortuner'
  return 'Kendaraan'
}

function extractRentalPeriod(description) {
  const match = String(description || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})/)
  if (!match) return { periodStart: null, periodEnd: null }

  const startYear = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
  const endYear = Number(match[6].length === 2 ? `20${match[6]}` : match[6])
  return {
    periodStart: `${startYear}-${pad2(Number(match[2]))}-${pad2(Number(match[1]))}`,
    periodEnd: `${endYear}-${pad2(Number(match[5]))}-${pad2(Number(match[4]))}`,
  }
}

function applyPayment(record, row) {
  const paymentDate = parseDate(row.getCell(9).value)
  const paymentNote = textValue(row.getCell(10).value)
  const transferredAmount = numericValue(row.getCell(11).value)

  if (!record.payment_date && paymentDate) record.payment_date = paymentDate
  if (!record.payment_note && paymentNote) record.payment_note = paymentNote
  if (!record.transferred_amount && transferredAmount) record.transferred_amount = transferredAmount
}

function mergeDescription(record, description) {
  if (!record || !description) return
  record.description = record.description ? `${record.description}\n${description}` : description
  if (record.service_type !== 'rental' && inferServiceType(description) === 'rental') {
    record.service_type = 'rental'
  }
}

function readSheetRows(sheet) {
  const records = []
  let current = null

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return

    const invoiceNumberCell = row.getCell(2)
    const invoiceNumber = textValue(invoiceNumberCell.value)
    const description = textValue(row.getCell(3).value)
    const amounts = readAmounts(row)

    if (invoiceNumber && isOwnCellValue(invoiceNumberCell)) {
      const invoiceDate = parseDate(row.getCell(1).value)
      if (!invoiceDate || amounts.total <= 0) return

      if (current && current.invoice_number === invoiceNumber) {
        mergeDescription(current, description)
        applyPayment(current, row)
        if (current.total_amount <= 0) {
          current.subtotal_amount = amounts.subtotal
          current.tax_amount = amounts.taxAmount
          current.pph_amount = amounts.pphAmount
          current.total_amount = amounts.total
        }
        return
      }

      current = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: invoiceDate,
        description,
        service_type: inferServiceType(description),
        subtotal_amount: amounts.subtotal,
        tax_amount: amounts.taxAmount,
        pph_amount: amounts.pphAmount,
        total_amount: amounts.total,
        payment_date: null,
        payment_note: '',
        transferred_amount: 0,
      }
      applyPayment(current, row)
      records.push(current)
      return
    }

    if (!current) return
    mergeDescription(current, description)
    applyPayment(current, row)
  })

  return records.filter((record) => Number(record.total_amount) > 0)
}

async function resolveFleet(record, transaction) {
  const plateNumber = extractPlateNumber(record.description)
  if (!plateNumber) return { fleetId: null, fleetLabel: 'TBD', created: false }

  const fleetInfo = inferFleetName(record.description)
  const [fleet, created] = await Fleet.findOrCreate({
    where: { plate_number: plateNumber },
    defaults: {
      plate_number: plateNumber,
      name: fleetInfo.name,
      category: fleetInfo.category,
      status: 'active',
      is_tbd: false,
      notes: `Dibuat otomatis dari import invoice ${record.invoice_number}.`,
    },
    transaction,
  })

  if (!created && (fleet.name !== fleetInfo.name || fleet.category !== fleetInfo.category)) {
    await fleet.update({
      name: fleetInfo.name,
      category: fleetInfo.category,
    }, { transaction })
  }

  return {
    fleetId: fleet.id,
    fleetLabel: `${fleetInfo.name} (${plateNumber})`,
    created,
  }
}

async function upsertCustomer(customerName, records, transaction) {
  const isPkp = records.some((record) => Number(record.tax_amount) > 0 || Number(record.pph_amount) > 0)
  const [customer] = await Customer.findOrCreate({
    where: { name: customerName },
    defaults: { name: customerName, is_pkp: isPkp },
    transaction,
  })

  if (isPkp && customer.is_pkp !== true) {
    await customer.update({ is_pkp: true }, { transaction })
  }

  return customer
}

async function upsertInvoice(record, customer, sheetName, transaction) {
  const fleet = await resolveFleet(record, transaction)
  const existing = await Invoice.findOne({ where: { invoice_number: record.invoice_number }, transaction })
  const subtotal = Number(record.subtotal_amount || record.total_amount)
  const total = Number(record.total_amount)
  const isPaid = Boolean(record.payment_date)
  const serviceType = record.service_type || 'delivery'
  const rentalPeriod = serviceType === 'rental' ? extractRentalPeriod(record.description) : { periodStart: null, periodEnd: null }
  const fleetLabel = serviceType === 'rental' && !fleet.fleetId
    ? inferRentalLabel(record.description)
    : fleet.fleetLabel
  const invoicePayload = {
    project_id: null,
    customer_id: customer.id,
    invoice_date: record.invoice_date,
    due_date: record.due_date,
    service_type: serviceType,
    delivery_pricing_mode: 'shipment',
    subtotal_amount: subtotal,
    tax_percent: percent(record.tax_amount, subtotal),
    tax_amount: record.tax_amount,
    pph_percent: percent(record.pph_amount, subtotal),
    pph_amount: record.pph_amount,
    insurance_amount: 0,
    total_amount: total,
    paid_amount: isPaid ? total : 0,
    status: isPaid ? 'paid' : 'outstanding',
    notes: `Import Excel "${sheetName}"`,
    payment_method: 'transfer',
    bank_account_id: null,
    created_by: null,
  }

  const invoice = existing
    ? await existing.update(invoicePayload, { transaction })
    : await Invoice.create({ invoice_number: record.invoice_number, ...invoicePayload }, { transaction })

  const itemPayload = {
    invoice_id: invoice.id,
    fleet_id: fleet.fleetId,
    fleet_label: fleetLabel,
    description: record.description,
    period_start: rentalPeriod.periodStart,
    period_end: rentalPeriod.periodEnd,
    qty: 1,
    unit: 'Unit',
    cargo_qty: null,
    cargo_unit: null,
    cargo_weight: null,
    cargo_volume: null,
    cargo_notes: null,
    unit_price: subtotal,
    subtotal,
    sort_order: 0,
    source_sj_id: null,
  }

  const item = await InvoiceItem.findOne({ where: { invoice_id: invoice.id }, transaction })
  if (item) await item.update(itemPayload, { transaction })
  else await InvoiceItem.create(itemPayload, { transaction })

  let paymentChanged = false
  if (isPaid) {
    const existingPayment = await Payment.findOne({
      where: { invoice_id: invoice.id, is_down_payment: false },
      transaction,
    })
    const transferNote = record.transferred_amount
      ? ` Total transfer gabungan: Rp ${record.transferred_amount.toLocaleString('id-ID')}.`
      : ''
    const paymentPayload = {
      invoice_id: invoice.id,
      payment_date: record.payment_date,
      amount: total,
      method: 'transfer',
      proof_path: null,
      notes: `${record.payment_note || 'Pembayaran dari data TGL LUNAS.'}${transferNote}`.trim(),
      is_down_payment: false,
      created_by: null,
    }
    if (existingPayment) await existingPayment.update(paymentPayload, { transaction })
    else await Payment.create(paymentPayload, { transaction })
    paymentChanged = true
  }

  return {
    action: existing ? 'updated' : 'created',
    paymentChanged,
    fleetCreated: fleet.created,
  }
}

async function importSheet(workbook, config) {
  const sheet = findSheet(workbook, config.sheetName)
  if (!sheet) throw new Error(`Sheet "${config.sheetName}" tidak ditemukan.`)

  const records = readSheetRows(sheet)
  if (records.length === 0) throw new Error(`Tidak ada invoice yang terbaca dari sheet ${sheet.name}.`)

  console.log(`\n${sheet.name}`)
  console.table(records.map((record) => ({
    invoice: record.invoice_number,
    invoice_date: record.invoice_date,
    subtotal: record.subtotal_amount,
    ppn: record.tax_amount,
    pph: record.pph_amount,
    total: record.total_amount,
    payment_date: record.payment_date || '',
    plate: extractPlateNumber(record.description) || '',
  })))

  return sequelize.transaction(async (transaction) => {
    const customer = await upsertCustomer(config.customerName, records, transaction)
    const result = { customer_id: customer.id, created: 0, updated: 0, payments: 0, fleets: 0 }

    for (const record of records) {
      const rowResult = await upsertInvoice(record, customer, sheet.name, transaction)
      result[rowResult.action] += 1
      if (rowResult.paymentChanged) result.payments += 1
      if (rowResult.fleetCreated) result.fleets += 1
    }

    return result
  })
}

async function main() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(WORKBOOK_PATH)

  for (const config of IMPORTS) {
    const result = await importSheet(workbook, config)
    console.log('Import selesai:', result)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await sequelize.close().catch(() => {})
  })
