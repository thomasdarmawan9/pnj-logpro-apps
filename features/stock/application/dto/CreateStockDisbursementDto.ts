export interface CreateStockDisbursementDto {
  disbursement_date: string
  stock_item_id: number
  qty: number
  kategori_name: string | null
  delivery_order_id: number | null
  sj_number_manual: string | null
  invoice_number_manual: string | null
  driver_name: string | null
  vehicle_plate: string | null
  destination: string | null
  customer_id: number | null
  notes: string | null
}
