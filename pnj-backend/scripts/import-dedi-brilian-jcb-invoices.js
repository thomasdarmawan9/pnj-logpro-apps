'use strict'

const path = require('path')
const ExcelJS = require('exceljs')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const {
  sequelize,
  Customer,
  Invoice,
  InvoiceItem,
  Payment,
} = require('../src/models')

const WORKBOOK_PATH = '/Users/thomasdarmawan/Downloads/LIST INVOICE DAN PEMBAYARAN.xlsx'

const IMPORTS = [
  {
    sheetName: 'PT. TIGA BERLIAN MANDIRI',
    customerName: 'PT. TIGA BERLIAN MANDIRI',
    layout: 'jcb',
  },
  {
    sheetName: 'YEREMIA WONGKAR',
    customerName: 'YEREMIA WONGKAR',
    layout: 'jcb',
  },
  {
    sheetName: 'PT. GIGAL',
    customerName: 'PT. GIGAL',
    layout: 'jcb',
  },
]

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseIndonesianDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}`
  }

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

function numericValue(cellValue) {
  if (cellValue === null || cellValue === undefined || cellValue === '') return 0
  if (typeof cellValue === 'number') return cellValue
  if (typeof cellValue === 'object' && cellValue.result !== undefined) {
    return numericValue(cellValue.result)
  }
  const normalized = String(cellValue).replace(/[^\d.-]/g, '')
  return normalized ? Number(normalized) : 0
}

function textValue(cellValue) {
  if (cellValue === null || cellValue === undefined) return ''
  if (cellValue instanceof Date) return ''
  if (typeof cellValue === 'object' && cellValue.text) return String(cellValue.text).trim()
  return String(cellValue).trim()
}

function isOwnCellValue(cell) {
  return !cell.isMerged || cell.master.address === cell.address
}

function percent(amount, subtotal) {
  if (!subtotal || !amount) return 0
  return Math.round((amount / subtotal * 100) * 100) / 100
}

function readRowAmounts(row, layout) {
  if (layout === 'jcb') {
    const dpp = numericValue(row.getCell(4).value)
    const ppn = numericValue(row.getCell(5).value)
    const pph = numericValue(row.getCell(6).value)
    const total = numericValue(row.getCell(7).value) || dpp
    return {
      subtotal: dpp || total,
      taxAmount: ppn,
      pphAmount: pph,
      total,
      paymentDate: parseIndonesianDate(row.getCell(8).value),
      paymentNote: textValue(row.getCell(8).value),
      transferredAmount: numericValue(row.getCell(9).value) || numericValue(row.getCell(10).value),
    }
  }

  const totalInvoice = numericValue(row.getCell(4).value)
  const dpp = numericValue(row.getCell(5).value)
  const ppn = numericValue(row.getCell(6).value)
  const pph = numericValue(row.getCell(7).value)
  const netTotal = numericValue(row.getCell(8).value)
  const subtotal = dpp > 0 ? dpp : totalInvoice
  return {
    subtotal,
    taxAmount: ppn,
    pphAmount: pph,
    total: netTotal > 0 ? netTotal : totalInvoice,
    paymentDate: parseIndonesianDate(row.getCell(9).value),
    paymentNote: textValue(row.getCell(9).value),
    transferredAmount: numericValue(row.getCell(10).value) || numericValue(row.getCell(11).value),
  }
}

function readSheetRows(sheet, layout) {
  const records = []
  let current = null

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return

    const invoiceNumberCell = row.getCell(2)
    const invoiceNumber = textValue(invoiceNumberCell.value)
    const description = textValue(row.getCell(3).value)
    const amounts = readRowAmounts(row, layout)

    if (invoiceNumber && isOwnCellValue(invoiceNumberCell)) {
      const invoiceDate = parseIndonesianDate(row.getCell(1).value)
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

    if (!current) return

    if (description) {
      current.description = `${current.description}\n${description}`
    }

    if (current.total_amount <= 0 && amounts.total > 0) {
      current.subtotal_amount = amounts.subtotal || amounts.total
      current.tax_amount = amounts.taxAmount
      current.pph_amount = amounts.pphAmount
      current.total_amount = amounts.total
    }
  })

  return records.filter(record => Number(record.total_amount) > 0)
}

async function upsertCustomer(customerName, records, transaction) {
  const isPkp = records.some(record => Number(record.tax_amount) > 0)
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
  const existing = await Invoice.findOne({
    where: { invoice_number: record.invoice_number },
    transaction,
  })
  const isPaid = Boolean(record.payment_date)
  const subtotal = Number(record.subtotal_amount || record.total_amount)
  const total = Number(record.total_amount)

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
    : await Invoice.create({
        invoice_number: record.invoice_number,
        ...invoicePayload,
      }, { transaction })

  const itemPayload = {
    invoice_id: invoice.id,
    fleet_id: null,
    fleet_label: 'TBD',
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
  if (item) {
    await item.update(itemPayload, { transaction })
  } else {
    await InvoiceItem.create(itemPayload, { transaction })
  }

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

    if (existingPayment) {
      await existingPayment.update(paymentPayload, { transaction })
    } else {
      await Payment.create(paymentPayload, { transaction })
    }
  }

  return existing ? 'updated' : 'created'
}

async function importSheet(workbook, config) {
  const sheet = workbook.getWorksheet(config.sheetName)
  if (!sheet) throw new Error(`Sheet "${config.sheetName}" tidak ditemukan.`)

  const records = readSheetRows(sheet, config.layout)
  if (records.length === 0) throw new Error(`Tidak ada invoice yang terbaca dari sheet ${config.sheetName}.`)

  console.log(`\n${config.sheetName}`)
  console.table(records.map(record => ({
    invoice: record.invoice_number,
    invoice_date: record.invoice_date,
    subtotal: record.subtotal_amount,
    ppn: record.tax_amount,
    pph: record.pph_amount,
    total: record.total_amount,
    payment_date: record.payment_date || '',
  })))

  return sequelize.transaction(async (transaction) => {
    const customer = await upsertCustomer(config.customerName, records, transaction)
    const result = {
      customer_id: customer.id,
      created: 0,
      updated: 0,
      payments: records.filter(record => record.payment_date).length,
    }

    for (const record of records) {
      const action = await upsertInvoice(record, customer, config.sheetName, transaction)
      result[action] += 1
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
