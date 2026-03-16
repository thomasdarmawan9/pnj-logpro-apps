import { StockItem } from '../../domain/entities/StockItem'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateStockItem(
  data: { code: string; name: string; unit: string },
  existingItems: StockItem[],
  editingUuid?: string
): ValidationResult {
  const errors: Record<string, string> = {}
  if (!data.code.trim()) errors.code = 'Kode barang wajib diisi'
  else if (!/^[A-Za-z0-9\-_]+$/.test(data.code)) errors.code = 'Kode hanya boleh huruf, angka, dan tanda hubung'
  const duplicate = existingItems.find(i => i.code === data.code && i.uuid !== editingUuid)
  if (duplicate) errors.code = 'Kode barang sudah digunakan'
  if (!data.name.trim()) errors.name = 'Nama barang wajib diisi'
  if (!data.unit.trim()) errors.unit = 'Satuan wajib diisi'
  return { valid: Object.keys(errors).length === 0, errors }
}
