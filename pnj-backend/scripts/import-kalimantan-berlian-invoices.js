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
const SHEET_NAME = 'PT.KALIMANTAN BERLIAN SEJAHTERA'
const CUSTOMER_NAME = 'PT. KALIMANTAN BERLIAN SEJAHTERA'

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}`
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    const standard = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
    if (standard) {
      const day = Number(standard[1])
      const month = Number(standard[2])
      const year = Number(standard[3].length === 2 ? `20${standard[3]}` : standard[3])
      return `${year}-${pad2(month)}-${pad2(day)}`
    }

    if (/4\+5\s*MEI\s*26/i.test(trimmed)) return '2026-05-05'
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

function extractPlateNumber(description) {
  const match = String(description || '').toUpperCase().match(/\b(KB|KH|B|M)\s*(\d{3,4})\s*([A-Z]{2,3})\b/)
  if (!match) return null
  return `${match[1]} ${match[2]} ${match[3]}`
}

function inferFleetCategory(description) {
  return /excavator|doser|traktor|alat berat|compactor|vibro/i.test(description)
    ? 'heavy_equipment'
    : 'truck'
}

function determineActualTotal(rowData) {
  const description = rowData.description.toLowerCase()
  const paymentNote = rowData.payment_note.toLowerCase()

  if (rowData.transferred_amount > 0) return rowData.transferred_amount
  if (rowData.dp_amount > 0 && description.includes('dp') && !paymentNote.includes('4+5')) {
    return rowData.dp_amount
  }
  if (rowData.total_invoice > 0 && (description.includes('pelunasan') || description.includes('dp') || rowData.dp_amount > 0)) {
    return rowData.total_invoice
  }
  if (rowData.net_total > 0) return rowData.net_total
  return rowData.total_invoice
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
    const dpp = numericValue(row.getCell(5).value)
    const ppn = numericValue(row.getCell(6).value)
    const pph = numericValue(row.getCell(7).value)
    const netTotal = numericValue(row.getCell(8).value)
    const dpAmount = numericValue(row.getCell(9).value)

    if (invoiceNumber && (totalInvoice > 0 || netTotal > 0 || dpAmount > 0) && isOwnCellValue(invoiceNumberCell)) {
      const rowData = {
        invoice_number: invoiceNumber,
        invoice_date: parseDate(row.getCell(1).value),
        due_date: parseDate(row.getCell(1).value),
        description,
        total_invoice: totalInvoice,
        dpp_amount: dpp,
        tax_amount_source: ppn,
        pph_amount_source: pph,
        net_total: netTotal,
        dp_amount: dpAmount,
        payment_date: parseDate(row.getCell(10).value),
        payment_note: textValue(row.getCell(10).value),
        transfer_note: textValue(row.getCell(11).value),
        transferred_amount: numericValue(row.getCell(12).value),
      }

      if (!rowData.invoice_date) return

      const actualTotal = determineActualTotal(rowData)
      current = {
        ...rowData,
        actual_total: actualTotal,
      }
      records.push(current)
      return
    }

    if (current && description) {
      current.description = `${current.description}\n${description}`
    }
  })

  for (const record of records) {
    record.actual_total = determineActualTotal(record)
  }

  return records
}

async function resolveFleet(record, transaction) {
  const plateNumber = extractPlateNumber(record.description)
  if (!plateNumber) return { fleetId: null, fleetLabel: 'TBD', created: false }

  const [fleet, created] = await Fleet.findOrCreate({
    where: { plate_number: plateNumber },
    defaults: {
      plate_number: plateNumber,
      name: `${inferFleetCategory(record.description) === 'heavy_equipment' ? 'Alat Berat' : 'Truck'} ${plateNumber}`,
      category: inferFleetCategory(record.description),
      status: 'active',
      is_tbd: false,
      notes: `Dibuat otomatis dari import invoice ${CUSTOMER_NAME}.`,
    },
    transaction,
  })

  return {
    fleetId: fleet.id,
    fleetLabel: `${fleet.name} (${fleet.plate_number})`,
    created,
  }
}

function buildNotes(record) {
  return [
    `Import Excel "${SHEET_NAME}".`,
    `Nilai sheet: TOTAL INVOICE=${record.total_invoice || 0}, DPP=${record.dpp_amount || 0}, PPN=${record.tax_amount_source || 0}, PPH=${record.pph_amount_source || 0}, TOTAL=${record.net_total || 0}, DP=${record.dp_amount || 0}.`,
    record.payment_note && !record.payment_date ? `Catatan tanggal lunas: ${record.payment_note}.` : null,
    record.transfer_note ? `Catatan transfer: ${record.transfer_note}.` : null,
  ].filter(Boolean).join(' ')
}

async function upsertPayment(invoice, record, transaction) {
  if (!record.payment_date) return false

  const existing = await Payment.findOne({
    where: { invoice_id: invoice.id, is_down_payment: false },
    transaction,
  })
  const paymentPayload = {
    invoice_id: invoice.id,
    payment_date: record.payment_date,
    amount: record.actual_total,
    method: 'transfer',
    proof_path: null,
    notes: [
      'Pembayaran dari data TGL LUNAS.',
      record.payment_note && !/^\d/.test(record.payment_note) ? `Tanggal lunas sheet: ${record.payment_note}.` : null,
      record.transfer_note ? `Transfer sheet: ${record.transfer_note}.` : null,
    ].filter(Boolean).join(' '),
    is_down_payment: false,
    created_by: null,
  }

  if (existing) {
    await existing.update(paymentPayload, { transaction })
  } else {
    await Payment.create(paymentPayload, { transaction })
  }
  return true
}

async function importRecords(records) {
  return sequelize.transaction(async (transaction) => {
    const [customer] = await Customer.findOrCreate({
      where: { name: CUSTOMER_NAME },
      defaults: { name: CUSTOMER_NAME, is_pkp: records.some(r => r.tax_amount_source > 0) },
      transaction,
    })

    if (records.some(r => r.tax_amount_source > 0) && customer.is_pkp !== true) {
      await customer.update({ is_pkp: true }, { transaction })
    }

    const result = {
      customer_id: customer.id,
      created: 0,
      updated: 0,
      payments: 0,
      fleets: 0,
    }

    for (const record of records) {
      const fleet = await resolveFleet(record, transaction)
      if (fleet.created) result.fleets += 1

      const isPaid = Boolean(record.payment_date)
      const invoicePayload = {
        project_id: null,
        customer_id: customer.id,
        invoice_date: record.invoice_date,
        due_date: record.due_date,
        service_type: 'delivery',
        subtotal_amount: record.actual_total,
        tax_percent: 0,
        tax_amount: 0,
        pph_percent: 0,
        pph_amount: 0,
        insurance_amount: 0,
        total_amount: record.actual_total,
        paid_amount: isPaid ? record.actual_total : 0,
        status: isPaid ? 'paid' : 'outstanding',
        notes: buildNotes(record),
        payment_method: 'transfer',
        bank_account_id: null,
        created_by: null,
      }

      const existing = await Invoice.findOne({
        where: { invoice_number: record.invoice_number },
        transaction,
      })
      const invoice = existing
        ? await existing.update(invoicePayload, { transaction })
        : await Invoice.create({
            invoice_number: record.invoice_number,
            ...invoicePayload,
          }, { transaction })

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
        unit_price: record.actual_total,
        subtotal: record.actual_total,
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

      if (await upsertPayment(invoice, record, transaction)) result.payments += 1

      result[existing ? 'updated' : 'created'] += 1
    }

    return result
  })
}

async function main() {
  const records = await readRows()
  if (records.length === 0) throw new Error(`Tidak ada invoice yang terbaca dari sheet ${SHEET_NAME}.`)

  console.table(records.map(record => ({
    invoice: record.invoice_number,
    date: record.invoice_date,
    total_invoice: record.total_invoice,
    net_total: record.net_total,
    dp: record.dp_amount,
    actual_total: record.actual_total,
    paid_date: record.payment_date || record.payment_note || '',
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
