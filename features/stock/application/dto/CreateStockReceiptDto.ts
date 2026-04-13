export interface CreateStockReceiptItemDto {
  stock_item_id: number
  qty: number
  notes: string | null
  kategori_name?: string | null
}

export interface CreateStockReceiptDto {
  receipt_date: string
  supplier_name: string | null
  document_number: string | null
  customer_id: number | null
  notes: string | null
  items: CreateStockReceiptItemDto[]
}
