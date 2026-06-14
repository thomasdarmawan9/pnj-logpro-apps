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
const SHEET_NAME = 'PT. EQUIPINDO PERKASA'
const CUSTOMER_NAME = 'PT. EQUIPINDO PERKASA'

function pad2(value) {
  return String(value).padStart(2, '0')
}

function toDateOnly(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
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

async function readRows() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(WORKBOOK_PATH)

  const sheet = workbook.getWorksheet(SHEET_NAME)
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan.`)

  const records = []
  let current = null

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return

    const invoiceNumberCell = row.getCell(2)
    const invoiceNumber = textValue(invoiceNumberCell.value)
    const description = textValue(row.getCell(3).value)
    const totalInvoice = numericValue(row.getCell(4).value)
    const subtotal = numericValue(row.getCell(5).value) || totalInvoice
    const taxAmount = numericValue(row.getCell(6).value)
    const pphAmount = numericValue(row.getCell(7).value)
    const netTotal = numericValue(row.getCell(8).value) || totalInvoice

    if (invoiceNumber && netTotal > 0 && isOwnCellValue(invoiceNumberCell)) {
      const invoiceDate = parseIndonesianDate(row.getCell(1).value)
      const paidDate = parseIndonesianDate(row.getCell(9).value)

      if (!invoiceDate) return

      current = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: invoiceDate,
        description,
        subtotal_amount: subtotal,
        tax_percent: percent(taxAmount, subtotal),
        tax_amount: taxAmount,
        pph_percent: percent(pphAmount, subtotal),
        pph_amount: pphAmount,
        total_amount: netTotal,
        payment_date: paidDate,
        payment_note: textValue(row.getCell(10).value),
        transferred_amount: numericValue(row.getCell(11).value),
      }
      records.push(current)
      return
    }

    if (current && description) {
      current.description = `${current.description}\n${description}`
    }
  })

  return records
}

async function importRecords(records) {
  return sequelize.transaction(async (transaction) => {
    const [customer] = await Customer.findOrCreate({
      where: { name: CUSTOMER_NAME },
      defaults: {
        name: CUSTOMER_NAME,
        is_pkp: true,
      },
      transaction,
    })

    const result = {
      customer_id: customer.id,
      created: 0,
      skipped: 0,
      updated: 0,
      payments: 0,
    }

    for (const record of records) {
      const existing = await Invoice.findOne({
        where: { invoice_number: record.invoice_number },
        transaction,
      })

      if (existing) {
        await existing.update({
          subtotal_amount: record.subtotal_amount,
          tax_percent: record.tax_percent,
          tax_amount: record.tax_amount,
          pph_percent: record.pph_percent,
          pph_amount: record.pph_amount,
          total_amount: record.total_amount,
          paid_amount: record.payment_date ? record.total_amount : 0,
          status: record.payment_date ? 'paid' : 'outstanding',
        }, { transaction })

        const item = await InvoiceItem.findOne({
          where: { invoice_id: existing.id },
          transaction,
        })
        if (item) {
          await item.update({
            fleet_id: null,
            fleet_label: 'TBD',
            description: record.description,
            unit_price: record.subtotal_amount,
            subtotal: record.subtotal_amount,
          }, { transaction })
        }
        result.updated += 1
        result.skipped += 1
        continue
      }

      const isPaid = Boolean(record.payment_date)
      const paidAmount = isPaid ? record.total_amount : 0

      const invoice = await Invoice.create({
        invoice_number: record.invoice_number,
        project_id: null,
        customer_id: customer.id,
        invoice_date: record.invoice_date,
        due_date: record.due_date,
        service_type: 'delivery',
        subtotal_amount: record.subtotal_amount,
        tax_percent: record.tax_percent,
        tax_amount: record.tax_amount,
        pph_percent: record.pph_percent,
        pph_amount: record.pph_amount,
        insurance_amount: 0,
        total_amount: record.total_amount,
        paid_amount: paidAmount,
        status: isPaid ? 'paid' : 'outstanding',
        notes: `Import Excel "${SHEET_NAME}"`,
        payment_method: 'transfer',
        bank_account_id: null,
        created_by: null,
      }, { transaction })

      await InvoiceItem.create({
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
        unit_price: record.subtotal_amount,
        subtotal: record.subtotal_amount,
        sort_order: 0,
        source_sj_id: null,
      }, { transaction })

      if (isPaid) {
        const transferNote = record.transferred_amount
          ? ` Total transfer gabungan: Rp ${record.transferred_amount.toLocaleString('id-ID')}.`
          : ''

        await Payment.create({
          invoice_id: invoice.id,
          payment_date: record.payment_date,
          amount: record.total_amount,
          method: 'transfer',
          proof_path: null,
          notes: `${record.payment_note || 'Pembayaran dari data TGL LUNAS.'}${transferNote}`.trim(),
          is_down_payment: false,
          created_by: null,
        }, { transaction })
        result.payments += 1
      }

      result.created += 1
    }

    return result
  })
}

async function main() {
  const records = await readRows()
  if (records.length === 0) throw new Error(`Tidak ada invoice yang terbaca dari sheet ${SHEET_NAME}.`)

  console.table(records.map((record) => ({
    invoice: record.invoice_number,
    invoice_date: record.invoice_date,
    subtotal: record.subtotal_amount,
    ppn: record.tax_amount,
    pph: record.pph_amount,
    total: record.total_amount,
    payment_date: record.payment_date || '',
  })))

  const result = await importRecords(records)
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
