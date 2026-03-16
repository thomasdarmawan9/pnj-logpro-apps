export interface CreateStockItemDto {
  code: string
  name: string
  category: string | null
  unit: string
  description: string | null
}
