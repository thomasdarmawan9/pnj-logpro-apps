'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { StockItem } from '@/features/stock/domain/entities/StockItem'
import { CreateStockItemDto } from '@/features/stock/application/dto/CreateStockItemDto'
import { validateStockItem } from '@/features/stock/application/validators/StockItemValidator'

const CATEGORY_SUGGESTIONS = ['Tiang', 'Pipa', 'Aksesori', 'Material', 'Lainnya']
const UNIT_SUGGESTIONS = ['Batang', 'Pcs', 'Unit', 'Set', 'Kg', 'Meter', 'Lembar', 'Buah']

interface AddStockItemModalProps {
  open: boolean
  editingItem?: StockItem | null
  existingItems: StockItem[]
  isSubmitting: boolean
  onClose: () => void
  onCreate: (dto: CreateStockItemDto) => void
  onUpdate: (uuid: string, dto: Partial<CreateStockItemDto>) => void
}

export default function AddStockItemModal({
  open,
  editingItem,
  existingItems,
  isSubmitting,
  onClose,
  onCreate,
  onUpdate,
}: AddStockItemModalProps) {
  const isEditing = !!editingItem

  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    unit: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setForm({
          code: editingItem.code,
          name: editingItem.name,
          category: editingItem.category ?? '',
          unit: editingItem.unit,
          description: editingItem.description ?? '',
        })
      } else {
        setForm({ code: '', name: '', category: '', unit: '', description: '' })
      }
      setErrors({})
    }
  }, [open, editingItem])

  if (!open) return null

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = () => {
    const validation = validateStockItem(
      { code: form.code, name: form.name, unit: form.unit },
      existingItems,
      editingItem?.uuid
    )
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    const dto: CreateStockItemDto = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category.trim() || null,
      unit: form.unit.trim(),
      description: form.description.trim() || null,
    }

    if (isEditing && editingItem) {
      onUpdate(editingItem.uuid, dto)
    } else {
      onCreate(dto)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-lg">{isEditing ? 'Edit Barang' : 'Tambah Barang Baru'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kode Barang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`form-input w-full ${errors.code ? 'error' : ''}`}
              value={form.code}
              onChange={e => handleChange('code', e.target.value)}
              placeholder="Contoh: TM-12-200"
              disabled={isEditing}
            />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
            {isEditing && <p className="text-xs text-gray-400 mt-1">Kode tidak dapat diubah setelah dibuat</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`form-input w-full ${errors.name ? 'error' : ''}`}
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Contoh: Tiang Beton TM 12/200"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
            <input
              type="text"
              list="category-list"
              className="form-input w-full"
              value={form.category}
              onChange={e => handleChange('category', e.target.value)}
              placeholder="Pilih atau ketik kategori"
            />
            <datalist id="category-list">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Satuan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="unit-list"
              className={`form-input w-full ${errors.unit ? 'error' : ''}`}
              value={form.unit}
              onChange={e => handleChange('unit', e.target.value)}
              placeholder="Contoh: Batang"
            />
            <datalist id="unit-list">
              {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
            </datalist>
            {errors.unit && <p className="text-xs text-red-600 mt-1">{errors.unit}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              className="form-input w-full resize-none"
              rows={2}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Opsional — keterangan tambahan"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border-card)' }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-60 transition-colors"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Barang'}
          </button>
        </div>
      </div>
    </div>
  )
}
