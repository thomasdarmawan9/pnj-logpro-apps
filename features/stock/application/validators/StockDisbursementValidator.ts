export interface ValidationResult {
  valid: boolean
  message: string
}

interface StockAvailability {
  name: string
  current_stock: number
  unit: string
}

export function validateDisbursement(stockItem: StockAvailability, qtyRequested: number): ValidationResult {
  if (qtyRequested <= 0) {
    return { valid: false, message: 'Qty harus lebih dari 0' }
  }
  if (qtyRequested > stockItem.current_stock) {
    return {
      valid: false,
      message: `Stok ${stockItem.name} tidak mencukupi. Tersedia: ${stockItem.current_stock} ${stockItem.unit}, diminta: ${qtyRequested} ${stockItem.unit}`
    }
  }
  return { valid: true, message: '' }
}
