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
const SHEET_NAME = 'WIKA-CIPTA-WEGE,KSO'
const CUSTOMER_NAME = 'WIKA-CIPTA-WEGE, KSO'

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}`
  }

  if (typeof value !== 'string') return null

  const clean = value.trim().toUpperCase()
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    let year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
    if (year === 2006) year = 2026
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  const monthMap = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MEI: 5,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AGU: 8,
    AUG: 8,
    SEP: 9,
    OKT: 10,
    OCT: 10,
    NOV: 11,
    DES: 12,
    DEC: 12,
  }
  const combinedMatch = clean.match(/^(\d{1,2})\s*\+\s*(\d{1,2})\s*([A-Z]+)\s*(\d{2}|\d{4})$/)
  if (combinedMatch) {
    const day = Number(combinedMatch[2])
    const month = monthMap[combinedMatch[3]]
    const year = Number(combinedMatch[4].length === 2 ? `20${combinedMatch[4]}` : combinedMatch[4])
    if (!month) return null
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

function readAmounts(row) {
  const totalInvoice = numericValue(row.getCell(4).value)
  const dpp = numericValue(row.getCell(5).value)
  const ppn = numericValue(row.getCell(6).value)
  const pph = numericValue(row.getCell(7).value)
  const netTotal = numericValue(row.getCell(8).value)
  const subtotal = dpp || totalInvoice || netTotal

  return {
    subtotal,
    taxAmount: ppn,
    pphAmount: pph,
    total: netTotal || totalInvoice || dpp,
  }
}

function readPayment(row) {
  const rawPaymentDate = row.getCell(9).value
  const rawPaymentNote = row.getCell(10).value
  const rawTransferAmount = row.getCell(11).value
  const paymentDateText = textValue(rawPaymentDate)
  const noteText = textValue(rawPaymentNote)

  return {
    paymentDate: parseDate(rawPaymentDate),
    paymentDateText,
    paymentNote: noteText,
    transferredAmount: numericValue(rawTransferAmount),
    cancelled: /CANCEL/i.test(paymentDateText) || /CANCEL/i.test(noteText) || /CANCEL/i.test(textValue(rawTransferAmount)),
  }
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

function applyAmounts(record, amounts) {
  if (!record || amounts.total <= 0) return
  if (record.total_amount > 0) return

  record.subtotal_amount = amounts.subtotal
  record.tax_amount = amounts.taxAmount
  record.pph_amount = amounts.pphAmount
  record.total_amount = amounts.total
}

function applyPayment(record, payment) {
  if (!record) return
  if (payment.cancelled) record.cancelled = true
  if (!record.payment_date && payment.paymentDate) record.payment_date = payment.paymentDate
  if (!record.payment_date_text && payment.paymentDateText) record.payment_date_text = payment.paymentDateText
  if (!record.payment_note && payment.paymentNote) record.payment_note = payment.paymentNote
  if (!record.transferred_amount && payment.transferredAmount > 0) record.transferred_amount = payment.transferredAmount
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
    const payment = readPayment(row)

    if (invoiceNumber && isOwnCellValue(invoiceNumberCell)) {
      const invoiceDate = parseDate(row.getCell(1).value)
      if (!invoiceDate) return

      current = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: invoiceDate,
        description,
        subtotal_amount: 0,
        tax_amount: 0,
        pph_amount: 0,
        total_amount: 0,
        payment_date: null,
        payment_date_text: '',
        payment_note: '',
        transferred_amount: 0,
        cancelled: false,
      }
      applyAmounts(current, amounts)
      applyPayment(current, payment)
      records.push(current)
      return
    }

    if (!current) return

    if (description) current.description = `${current.description}\n${description}`
    applyAmounts(current, amounts)
    applyPayment(current, payment)
  })

  return records.filter((record) => !record.cancelled && Number(record.total_amount) > 0)
}

async function resolveFleet(record, transaction) {
  const plate = extractPlateNumber(record.description)
  if (!plate) return { fleetId: null, fleetLabel: 'TBD', created: false }

  const category = inferFleetCategory(record.description)
  const [fleet, created] = await Fleet.findOrCreate({
    where: { plate_number: plate },
    defaults: {
      plate_number: plate,
      name: `${category === 'family_car' ? 'Mobil' : 'Truck'} ${plate}`,
      category,
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

async function upsertInvoice(record, customer, transaction) {
  const existing = await Invoice.findOne({
    where: { invoice_number: record.invoice_number },
    transaction,
  })
  const fleet = await resolveFleet(record, transaction)
  const subtotal = Number(record.subtotal_amount || record.total_amount)
  const total = Number(record.total_amount)
  const isPaid = Boolean(record.payment_date)
  const notes = [`Import Excel "${SHEET_NAME}"`]
  if (record.payment_date_text === '30/03/06') {
    notes.push('Tanggal lunas 30/03/06 diasumsikan 2026-03-30 dari konteks sheet.')
  }

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
    notes: notes.join(' '),
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
    const paymentParts = []
    if (record.payment_date_text) paymentParts.push(`TGL LUNAS sheet: ${record.payment_date_text}.`)
    if (record.payment_note) paymentParts.push(record.payment_note)
    if (record.transferred_amount) {
      paymentParts.push(`Total transfer gabungan: Rp ${record.transferred_amount.toLocaleString('id-ID')}.`)
    }
    if (record.payment_date_text === '30/03/06') {
      paymentParts.push('Tanggal lunas diasumsikan 30/03/2026.')
    }

    const paymentPayload = {
      invoice_id: invoice.id,
      payment_date: record.payment_date,
      amount: total,
      method: 'transfer',
      proof_path: null,
      notes: paymentParts.join(' ').trim() || 'Pembayaran dari data TGL LUNAS.',
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

async function main() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(WORKBOOK_PATH)
  const sheet = workbook.getWorksheet(SHEET_NAME)
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan.`)

  const records = readSheetRows(sheet)
  console.log(`\n${SHEET_NAME}`)
  console.table(records.map((record) => ({
    invoice: record.invoice_number,
    invoice_date: record.invoice_date,
    subtotal: record.subtotal_amount,
    ppn: record.tax_amount,
    pph: record.pph_amount,
    total: record.total_amount,
    payment_date: record.payment_date || '',
    payment_text: record.payment_date_text,
    transfer: record.transferred_amount || '',
    plate: extractPlateNumber(record.description) || '',
  })))

  const result = await sequelize.transaction(async (transaction) => {
    const [customer] = await Customer.findOrCreate({
      where: { name: CUSTOMER_NAME },
      defaults: {
        name: CUSTOMER_NAME,
        is_pkp: records.some((record) => Number(record.tax_amount) > 0),
      },
      transaction,
    })
    if (records.some((record) => Number(record.tax_amount) > 0) && customer.is_pkp !== true) {
      await customer.update({ is_pkp: true }, { transaction })
    }

    const summary = {
      customer_id: customer.id,
      created: 0,
      updated: 0,
      payments: 0,
      fleets: 0,
      skipped_cancelled: 1,
    }

    for (const record of records) {
      const rowResult = await upsertInvoice(record, customer, transaction)
      summary[rowResult.action] += 1
      if (rowResult.paymentChanged) summary.payments += 1
      if (rowResult.fleetCreated) summary.fleets += 1
    }

    return summary
  })

  console.log('Import selesai:', result)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await sequelize.close().catch(() => {})
  })
