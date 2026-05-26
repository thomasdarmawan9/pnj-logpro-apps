import { StockItem } from './StockItem'

export interface StockDisbursement {
  id: number
  uuid: string
  disbursement_number: string
  disbursement_date: string
  stock_item_id: number
  stock_item: StockItem
  qty: number
  kategori_name?: string | null
  source_type?: 'manual' | 'sj_auto'
  delivery_order_id: number | null
  delivery_order?: {
    sj_number: string
    fleet: { plate_number: string; name: string }
    driver_name: string
    destination: string
    invoice?: { invoice_number: string } | null
  } | null
  sj_number_manual: string | null
  invoice_number_manual: string | null
  driver_name: string | null
  vehicle_plate: string | null
  destination: string | null
  customer_id: number | null
  customer?: { id: number; uuid?: string; name: string } | null
  notes: string | null
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}
