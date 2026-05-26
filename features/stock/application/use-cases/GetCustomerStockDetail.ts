import { StockDisbursement } from '../../domain/entities/StockDisbursement'
import { StockReceipt, StockReceiptItem } from '../../domain/entities/StockReceipt'

export interface CustomerStockItemRow {
  stockItemId: number
  stockItemUuid: string
  code: string
  name: string
  unit: string
  categories: string[]
  totalIn: number
  totalOut: number
  balance: number
}

export interface CustomerStockAvailableItem {
  stockItemId: number
  stockItemUuid: string
  code: string
  name: string
  unit: string
  categoryName: string | null
  categories: string[]
  availableQty: number
}

export interface CustomerStockTransactionRow {
  id: string
  date: string
  type: 'masuk' | 'keluar'
  number: string
  itemCode: string
  itemName: string
  category: string | null
  qty: number
  unit: string
  partner: string
  reference: string
  sjNumber: string | null
  invoiceNumber: string | null
  destination: string | null
  driverName?: string | null
  vehiclePlate?: string | null
  notes: string | null
  detailPath: string
}

export interface CustomerStockSummary {
  customerId: number
  customerUuid: string
  customerName: string
  totalAsset: number
  totalItemTypes: number
  totalIn: number
  totalOut: number
  itemRows: CustomerStockItemRow[]
  transactions: CustomerStockTransactionRow[]
}

function roundQty(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function customerKey(customer: { id: number; uuid?: string; name: string }) {
  return customer.uuid || String(customer.id)
}

function matchesCustomer(customer: { id: number; uuid?: string } | null | undefined, key: string) {
  if (!customer) return false
  return customer.uuid === key || String(customer.id) === key
}

function ensureSummary(
  map: Map<string, CustomerStockSummary>,
  customer: { id: number; uuid?: string; name: string }
) {
  const key = customerKey(customer)
  const existing = map.get(key)
  if (existing) return existing

  const summary: CustomerStockSummary = {
    customerId: customer.id,
    customerUuid: key,
    customerName: customer.name,
    totalAsset: 0,
    totalItemTypes: 0,
    totalIn: 0,
    totalOut: 0,
    itemRows: [],
    transactions: [],
  }
  map.set(key, summary)
  return summary
}

function ensureItemRow(summary: CustomerStockSummary, item: StockReceiptItem['stock_item'] | StockDisbursement['stock_item']) {
  let row = summary.itemRows.find(r => r.stockItemId === item.id)
  if (row) return row

  row = {
    stockItemId: item.id,
    stockItemUuid: item.uuid,
    code: item.code,
    name: item.name,
    unit: item.unit,
    categories: [],
    totalIn: 0,
    totalOut: 0,
    balance: 0,
  }
  summary.itemRows.push(row)
  return row
}

function finalizeSummary(summary: CustomerStockSummary) {
  summary.itemRows = summary.itemRows
    .map(row => ({
      ...row,
      categories: [...row.categories].sort((a, b) => a.localeCompare(b)),
      totalIn: roundQty(row.totalIn),
      totalOut: roundQty(row.totalOut),
      balance: roundQty(row.totalIn - row.totalOut),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  summary.totalIn = roundQty(summary.itemRows.reduce((sum, row) => sum + row.totalIn, 0))
  summary.totalOut = roundQty(summary.itemRows.reduce((sum, row) => sum + row.totalOut, 0))
  summary.totalAsset = roundQty(summary.itemRows.reduce((sum, row) => sum + row.balance, 0))
  summary.totalItemTypes = summary.itemRows.length
  summary.transactions.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return a.type.localeCompare(b.type)
  })
}

export function buildCustomerStockSummaries(
  receipts: StockReceipt[],
  disbursements: StockDisbursement[]
) {
  const map = new Map<string, CustomerStockSummary>()

  receipts.forEach(receipt => {
    if (!receipt.customer) return
    const summary = ensureSummary(map, receipt.customer)

    receipt.items.forEach(item => {
      const row = ensureItemRow(summary, item.stock_item)
      row.totalIn += item.qty
      if (item.kategori_name && !row.categories.includes(item.kategori_name)) {
        row.categories.push(item.kategori_name)
      }

      summary.transactions.push({
        id: `receipt-${receipt.uuid}-${item.uuid}`,
        date: receipt.receipt_date,
        type: 'masuk',
        number: receipt.receipt_number,
        itemCode: item.stock_item.code,
        itemName: item.stock_item.name,
        category: item.kategori_name,
        qty: item.qty,
        unit: item.stock_item.unit,
        partner: receipt.supplier_name || '-',
        reference: receipt.document_number || receipt.receipt_number,
        sjNumber: null,
        invoiceNumber: null,
        destination: null,
        notes: item.notes || receipt.notes,
        detailPath: `/stok/masuk/${receipt.uuid}`,
      })
    })
  })

  disbursements.forEach(disbursement => {
    if (!disbursement.customer) return
    const summary = ensureSummary(map, disbursement.customer)
    const row = ensureItemRow(summary, disbursement.stock_item)
    row.totalOut += disbursement.qty
    if (disbursement.kategori_name && !row.categories.includes(disbursement.kategori_name)) {
      row.categories.push(disbursement.kategori_name)
    }

    summary.transactions.push({
      id: `disbursement-${disbursement.uuid}`,
      date: disbursement.disbursement_date,
      type: 'keluar',
      number: disbursement.disbursement_number,
      itemCode: disbursement.stock_item.code,
      itemName: disbursement.stock_item.name,
      category: disbursement.kategori_name ?? null,
      qty: disbursement.qty,
      unit: disbursement.stock_item.unit,
      partner: disbursement.driver_name || disbursement.delivery_order?.driver_name || '-',
      reference: disbursement.sj_number_manual
        ? `SJ ${disbursement.sj_number_manual}`
        : disbursement.delivery_order?.sj_number || disbursement.disbursement_number,
      sjNumber: disbursement.delivery_order?.sj_number || disbursement.sj_number_manual || null,
      invoiceNumber: disbursement.delivery_order?.invoice?.invoice_number || disbursement.invoice_number_manual || null,
      destination: disbursement.destination || disbursement.delivery_order?.destination || null,
      notes: disbursement.notes,
      detailPath: `/stok/keluar/${disbursement.uuid}`,
    })
  })

  const summaries = Array.from(map.values())
  summaries.forEach(finalizeSummary)
  return summaries.sort((a, b) => a.customerName.localeCompare(b.customerName))
}

export function getCustomerStockDetail(
  customerUuidOrId: string,
  receipts: StockReceipt[],
  disbursements: StockDisbursement[]
) {
  const receiptRows = receipts.filter(receipt => matchesCustomer(receipt.customer, customerUuidOrId))
  const disbursementRows = disbursements.filter(disbursement => matchesCustomer(disbursement.customer, customerUuidOrId))
  const [summary] = buildCustomerStockSummaries(receiptRows, disbursementRows)
  return summary ?? null
}
