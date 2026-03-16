export interface StockItem {
  id: number
  uuid: string
  code: string
  name: string
  category: string | null
  unit: string
  description: string | null
  is_active: boolean
  current_stock: number
  peak_stock: number
  created_by: number
  created_at: string
  updated_at: string
}
