export interface StockRecapRow {
  date: string
  type: 'receipt' | 'disbursement'
  reference_number: string
  sj_or_spal: string
  supplier_or_driver: string
  vehicle_plate: string | null
  destination: string | null
  qty_in: number | null
  qty_out: number | null
  balance: number
  notes: string | null
}

export interface StockFilters {
  search: string
  itemId: number | null
  period: 'all' | 'this_month' | 'last_month' | 'custom'
  periodFrom: string
  periodTo: string
  customerId: number | null
}
