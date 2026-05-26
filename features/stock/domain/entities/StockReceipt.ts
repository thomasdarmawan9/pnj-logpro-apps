import { StockItem } from './StockItem'

export interface StockReceiptItem {
  id: number
  uuid: string
  receipt_id: number
  stock_item_id: number
  stock_item: StockItem
  qty: number
  notes: string | null
  kategori_name: string | null
}

export interface StockReceipt {
  id: number
  uuid: string
  receipt_number: string
  receipt_date: string
  supplier_name: string | null
  document_number: string | null
  customer_id: number | null
  customer?: { id: number; uuid?: string; name: string } | null
  notes: string | null
  items: StockReceiptItem[]
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}
