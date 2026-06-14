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
  { sheetName: 'EDWIN MUSALIM', customerName: 'EDWIN MUSALIM', layout: 'tax' },
  { sheetName: 'SAMURA', customerName: 'SAMURA', layout: 'tax' },
  { sheetName: 'PT. WELLINDO JAYA KIATGUNA', customerName: 'PT. WELLINDO JAYA KIATGUNA', layout: 'tax' },
  { sheetName: 'PT. AISIN INDONESIA', customerName: 'PT. AISIN INDONESIA', layout: 'tax' },
  { sheetName: 'KAK KHAFIZ', customerName: 'KAK KHAFIZ', layout: 'nominal' },
  { sheetName: 'PT. MAS AUTOMOBIL SEJAHTERA', customerName: 'PT. MAS AUTOMOBIL SEJAHTERA', layout: 'nominal' },
  { sheetName: 'PT.SGP', customerName: 'PT. SGP', layout: 'nominal' },
  { sheetName: 'PT. GRAHA INTI JAYA', customerName: 'PT. GRAHA INTI JAYA', layout: 'nominal' },
]

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return `${value.getFullYear()}-${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}`

  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
    if (!match) return null

    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  return null
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
  if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value.trim())) return ''
  if (typeof value === 'object' && value.text) return String(value.text).trim()
  return String(value).trim()
}

function isOwnCellValue(cell) {
  return !cell.isMerged || cell.master.address === cell.address
}

function percent(amount, subtotal) {
  if (!subtotal || !amount) return 0
  return Math.round((amount / subtotal * 100) * 100) / 100
}

function extractPlateNumber(description) {
  const match = String(description || '').toUpperCase().match(/\b(KB|BK|B|BE|KH|BM|M)\s*(\d{3,4})\s*([A-Z]{2,3})\b/)
  if (!match) return null
  return `${match[1]} ${match[2]} ${match[3]}`
}

function inferFleetCategory(description) {
  return /hilux|innova|avanza|zenix|fortuner|alphard|alpard|mobil/i.test(description)
    ? 'family_car'
    : 'truck'
}

function readAmounts(row, layout) {
  if (layout === 'tax') {
    const dpp = numericValue(row.getCell(4).value)
    const ppn = numericValue(row.getCell(5).value)
    const pph = numericValue(row.getCell(6).value)
    const total = numericValue(row.getCell(7).value) || dpp

    return {
      subtotal: dpp || total,
      taxAmount: ppn,
      pphAmount: pph,
      total,
      paymentDate: parseDate(row.getCell(8).value),
      paymentNote: textValue(row.getCell(8).value) || textValue(row.getCell(9).value),
      transferredAmount: numericValue(row.getCell(9).value) || numericValue(row.getCell(10).value),
    }
  }

  const total = numericValue(row.getCell(4).value)
  return {
    subtotal: total,
    taxAmount: 0,
    pphAmount: 0,
    total,
    paymentDate: parseDate(row.getCell(5).value),
    paymentNote: textValue(row.getCell(5).value) || textValue(row.getCell(6).value),
    transferredAmount: numericValue(row.getCell(6).value) || numericValue(row.getCell(7).value),
  }
}

function readSheetRows(sheet, layout) {
  const records = []
  let current = null

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return

    const invoiceNumberCell = row.getCell(2)
    const invoiceNumber = textValue(invoiceNumberCell.value)
    const description = textValue(row.getCell(3).value)
    const amounts = readAmounts(row, layout)

    if (invoiceNumber && amounts.total > 0 && isOwnCellValue(invoiceNumberCell)) {
      const invoiceDate = parseDate(row.getCell(1).value)
      if (!invoiceDate) return

      current = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: invoiceDate,
        description,
        subtotal_amount: amounts.subtotal,
        tax_amount: amounts.taxAmount,
        pph_amount: amounts.pphAmount,
        total_amount: amounts.total,
        payment_date: amounts.paymentDate,
        payment_note: amounts.paymentNote,
        transferred_amount: amounts.transferredAmount,
      }
      records.push(current)
      return
    }

    if (!current || !description) return
    current.description = `${current.description}\n${description}`
  })

  return records
}

async function resolveFleet(record, transaction) {
  const plate = extractPlateNumber(record.description)
  if (!plate) return { fleetId: null, fleetLabel: 'TBD', created: false }

  const [fleet, created] = await Fleet.findOrCreate({
    where: { plate_number: plate },
    defaults: {
      plate_number: plate,
      name: `${inferFleetCategory(record.description) === 'family_car' ? 'Mobil' : 'Truck'} ${plate}`,
      category: inferFleetCategory(record.description),
      status: 'active',
      is_tbd: false,
      notes: `Dibuat otomatis dari import invoice ${record.invoice_number}.`,
    },
    transaction,
  })

  return {
    fleetId: fleet.id,
    fleetLabel: `${fleet.name} (${fleet.plate_number})`,
    created,
  }
}

async function upsertCustomer(customerName, records, transaction) {
  const isPkp = records.some((record) => Number(record.tax_amount) > 0)
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
  const existing = await Invoice.findOne({
    where: { invoice_number: record.invoice_number },
    transaction,
  })

  const subtotal = Number(record.subtotal_amount || record.total_amount)
  const total = Number(record.total_amount)
  const isPaid = Boolean(record.payment_date)
  const invoicePayload = {
    project_id: null,
    customer_id: customer.id,
    invoice_date: record.invoice_date,
    due_date: record.due_date,
    service_type: 'delivery',
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
    fleet_label: fleet.fleetLabel,
    description: record.description,
    period_start: null,
    period_end: null,
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

  const item = await InvoiceItem.findOne({
    where: { invoice_id: invoice.id },
    transaction,
  })
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
  const sheet = workbook.getWorksheet(config.sheetName)
  if (!sheet) throw new Error(`Sheet "${config.sheetName}" tidak ditemukan.`)

  const records = readSheetRows(sheet, config.layout)
  if (records.length === 0) throw new Error(`Tidak ada invoice yang terbaca dari sheet ${config.sheetName}.`)

  console.log(`\n${config.sheetName}`)
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
    const result = {
      customer_id: customer.id,
      created: 0,
      updated: 0,
      payments: 0,
      fleets: 0,
    }

    for (const record of records) {
      const rowResult = await upsertInvoice(record, customer, config.sheetName, transaction)
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
