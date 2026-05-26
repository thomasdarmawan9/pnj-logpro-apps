import { StockReceipt } from '../../domain/entities/StockReceipt'
import { StockDisbursement } from '../../domain/entities/StockDisbursement'
import { StockRecapRow } from '../../domain/value-objects/StockBalance'

export function calculateRunningBalance(
  receipts: StockReceipt[],
  disbursements: StockDisbursement[],
  stockItemId: number,
  fromDate?: string,
  toDate?: string
): StockRecapRow[] {
  const rows: StockRecapRow[] = []

  receipts.forEach(receipt => {
    receipt.items.forEach(item => {
      if (item.stock_item_id === stockItemId) {
        rows.push({
          date: receipt.receipt_date,
          type: 'receipt',
          reference_number: receipt.receipt_number,
          sj_or_spal: receipt.document_number ?? receipt.receipt_number,
          supplier_or_driver: receipt.supplier_name ?? '—',
          vehicle_plate: null,
          destination: null,
          qty_in: item.qty,
          qty_out: null,
          balance: 0,
          notes: item.notes,
          kategori_name: item.kategori_name ?? null,
        })
      }
    })
  })

  disbursements.forEach(disb => {
    if (disb.stock_item_id === stockItemId) {
      rows.push({
        date: disb.disbursement_date,
        type: 'disbursement',
        reference_number: disb.disbursement_number,
        sj_or_spal: disb.sj_number_manual ? `SJ ${disb.sj_number_manual}` : disb.disbursement_number,
        supplier_or_driver: disb.driver_name ?? '—',
        vehicle_plate: disb.vehicle_plate,
        destination: disb.destination,
        qty_in: null,
        qty_out: disb.qty,
        balance: 0,
        notes: disb.notes,
        kategori_name: disb.kategori_name ?? null,
      })
    }
  })

  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let balance = 0
  const withBalance = rows.map(row => {
    if (row.qty_in) balance += row.qty_in
    if (row.qty_out) balance -= row.qty_out
    return { ...row, balance }
  })

  if (fromDate || toDate) {
    return withBalance.filter(row => {
      const d = row.date
      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      return true
    })
  }

  return withBalance
}
