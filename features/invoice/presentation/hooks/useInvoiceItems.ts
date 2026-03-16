import { useState, useMemo } from 'react'
import { InvoiceItem } from '../../domain/entities/Invoice'

type PartialItem = Omit<InvoiceItem, 'id' | 'invoice_id'>

export function useInvoiceItems(initialItems: PartialItem[] = []) {
  const [items, setItems] = useState<PartialItem[]>(initialItems)

  const calculateItemSubtotal = (item: Partial<PartialItem>): number =>
    Math.round((item.qty ?? 0) * (item.unit_price ?? 0))

  const subtotalAmount = useMemo(
    () => items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0),
    [items]
  )

  const calculateTax = (subtotal: number, taxPercent: number): number =>
    Math.round((subtotal * taxPercent) / 100)

  const totalAmount = (subtotal: number, taxAmount: number): number =>
    subtotal + taxAmount

  const addItem = () => {
    const newItem: PartialItem = {
      uuid: crypto.randomUUID(),
      fleet_id: null,
      fleet: null,
      fleet_label: '',
      description: 'Tagihan Biaya Jasa Sewa Kendaraan',
      period_start: null,
      period_end: null,
      qty: 1,
      unit: 'Unit',
      unit_price: 0,
      subtotal: 0,
      sort_order: items.length,
    }
    setItems(prev => [...prev, newItem])
  }

  const updateItem = (uuid: string, field: string, value: unknown) => {
    setItems(prev => prev.map(item => {
      if (item.uuid !== uuid) return item
      const updated = { ...item, [field]: value }
      updated.subtotal = calculateItemSubtotal(updated)
      return updated
    }))
  }

  const removeItem = (uuid: string) =>
    setItems(prev => prev.filter(item => item.uuid !== uuid))

  const reorderItems = (fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const result = [...prev]
      const [moved] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, moved)
      return result.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  const resetItems = (newItems: PartialItem[]) => setItems(newItems)

  return {
    items,
    subtotalAmount,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    resetItems,
    calculateTax,
    totalAmount,
  }
}
