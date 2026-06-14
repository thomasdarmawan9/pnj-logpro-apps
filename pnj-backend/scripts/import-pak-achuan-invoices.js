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
const SHEET_NAME = 'PAK ACHUAN'
const CUSTOMER_NAME = 'PAK ACHUAN'

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
  return String(value).trim()
}

function extractPlateNumber(description) {
  const match = String(description || '').toUpperCase().match(/\b(KB|BK|B|BE|KH|BM|M)\s*(\d{3,4})\s*([A-Z]{2,3})\b/)
  if (!match) return null
  return `${match[1]} ${match[2]} ${match[3]}`
}

async function resolveFleet(record, transaction) {
  const plate = extractPlateNumber(record.description)
  if (!plate) return { fleetId: null, fleetLabel: 'TBD', created: false }

  const [fleet, created] = await Fleet.findOrCreate({
    where: { plate_number: plate },
    defaults: {
      plate_number: plate,
      name: `Truck ${plate}`,
      category: 'truck',
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

function readSheetRows(sheet) {
  const records = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return

    const invoiceNumber = textValue(row.getCell(2).value)
    const invoiceDate = parseDate(row.getCell(1).value)
    const total = numericValue(row.getCell(4).value)
    if (!invoiceNumber || !invoiceDate || total <= 0) return

    records.push({
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: invoiceDate,
      description: textValue(row.getCell(3).value),
      subtotal_amount: total,
      tax_amount: 0,
      pph_amount: 0,
      total_amount: total,
      payment_date: parseDate(row.getCell(5).value),
      transferred_amount: numericValue(row.getCell(6).value) || numericValue(row.getCell(7).value),
    })
  })

  return records
}

async function main() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(WORKBOOK_PATH)
  const sheet = workbook.getWorksheet(SHEET_NAME)
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan.`)

  const records = readSheetRows(sheet)
  if (records.length === 0) throw new Error(`Tidak ada invoice yang terbaca dari sheet ${SHEET_NAME}.`)

  console.log(`\n${SHEET_NAME}`)
  console.table(records.map((record) => ({
    invoice: record.invoice_number,
    invoice_date: record.invoice_date,
    total: record.total_amount,
    payment_date: record.payment_date || '',
    plate: extractPlateNumber(record.description) || '',
  })))

  const result = await sequelize.transaction(async (transaction) => {
    const [customer] = await Customer.findOrCreate({
      where: { name: CUSTOMER_NAME },
      defaults: { name: CUSTOMER_NAME, is_pkp: false },
      transaction,
    })

    const summary = { customer_id: customer.id, created: 0, updated: 0, payments: 0, fleets: 0 }

    for (const record of records) {
      const fleet = await resolveFleet(record, transaction)
      if (fleet.created) summary.fleets += 1

      const existing = await Invoice.findOne({
        where: { invoice_number: record.invoice_number },
        transaction,
      })
      const isPaid = Boolean(record.payment_date)
      const invoicePayload = {
        project_id: null,
        customer_id: customer.id,
        invoice_date: record.invoice_date,
        due_date: record.due_date,
        service_type: 'delivery',
        subtotal_amount: record.subtotal_amount,
        tax_percent: 0,
        tax_amount: 0,
        pph_percent: 0,
        pph_amount: 0,
        insurance_amount: 0,
        total_amount: record.total_amount,
        paid_amount: isPaid ? record.total_amount : 0,
        status: isPaid ? 'paid' : 'outstanding',
        notes: `Import Excel "${SHEET_NAME}"`,
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
        unit_price: record.subtotal_amount,
        subtotal: record.subtotal_amount,
        sort_order: 0,
        source_sj_id: null,
      }
      const item = await InvoiceItem.findOne({ where: { invoice_id: invoice.id }, transaction })
      if (item) await item.update(itemPayload, { transaction })
      else await InvoiceItem.create(itemPayload, { transaction })

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
          amount: record.total_amount,
          method: 'transfer',
          proof_path: null,
          notes: `Pembayaran dari data TGL LUNAS.${transferNote}`.trim(),
          is_down_payment: false,
          created_by: null,
        }
        if (existingPayment) await existingPayment.update(paymentPayload, { transaction })
        else await Payment.create(paymentPayload, { transaction })
        summary.payments += 1
      }

      summary[existing ? 'updated' : 'created'] += 1
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
