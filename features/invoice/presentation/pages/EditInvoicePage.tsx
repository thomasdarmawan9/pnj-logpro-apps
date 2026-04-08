'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, ArrowLeft, Pencil } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { updateInvoice } from '@/store/slices/invoiceSlice'
import { useToast } from '@/components/toast/useToast'
import { InvoiceStatus } from '../../domain/entities/Invoice'
import { validateUpdateInvoice } from '../../application/validators/InvoiceValidator'
import useInvoiceDetail from '../hooks/useInvoiceDetail'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import InvoiceItemRow from '../components/InvoiceItemRow'
import InvoiceTaxCalculator from '../components/InvoiceTaxCalculator'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface Props { uuid: string }

export default function EditInvoicePage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const role = useSelector((state: RootState) => state.auth.user?.role ?? 'super_admin')
  const { invoice, isLoading } = useInvoiceDetail(uuid)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taxPercent, setTaxPercent] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [pphPercent, setPphPercent] = useState(2)
  const [pphEnabled, setPphEnabled] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, calculateTax, totalAmount } = useInvoiceItems()

  useEffect(() => {
    if (invoice) {
      if (invoice.status !== InvoiceStatus.DRAFT) {
        pushToast({ title: 'Tidak dapat diedit', description: `Invoice ini tidak dapat diedit karena status sudah ${invoice.status.toUpperCase()}.`, variant: 'error' })
        router.replace(`/invoice/${uuid}`)
        return
      }
      setDueDate(invoice.due_date)
      setNotes(invoice.notes ?? '')
      setTaxPercent(invoice.tax_percent)
      setTaxEnabled(invoice.tax_percent > 0)
      setPphPercent(invoice.pph_percent > 0 ? invoice.pph_percent : 2)
      setPphEnabled(invoice.pph_percent > 0)
      resetItems(invoice.items.map(item => ({
        uuid: item.uuid,
        fleet_id: item.fleet_id ?? null,
        fleet: item.fleet ?? null,
        fleet_label: item.fleet_label,
        description: item.description,
        period_start: item.period_start,
        period_end: item.period_end,
        qty: item.qty,
        unit: item.unit,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        sort_order: item.sort_order,
      })))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice])

  if (role === 'admin_ops') {
    router.replace('/dashboard')
    return null
  }

  const taxAmount = taxEnabled ? calculateTax(subtotalAmount, taxPercent) : 0
  const pphAmount = pphEnabled ? Math.round(subtotalAmount * pphPercent / 100) : 0
  const nettoAmount = totalAmount(subtotalAmount, taxAmount) - pphAmount
  const today = new Date().toISOString().split('T')[0]
  const isDueDatePast = dueDate < today

  const handleSave = async () => {
    const dto = {
      due_date: dueDate,
      notes: notes || null,
      tax_percent: taxEnabled ? taxPercent : 0,
      pph_percent: pphEnabled ? pphPercent : 0,
      items: items.map((item, idx) => ({
        fleet_id: item.fleet_id ?? null,
        fleet_label: item.fleet_label,
        description: item.description,
        period_start: item.period_start,
        period_end: item.period_end,
        qty: item.qty,
        unit: item.unit,
        unit_price: item.unit_price,
        sort_order: idx,
      })),
    }
    const result = validateUpdateInvoice(dto)
    setErrors(result.errors)
    if (!result.valid) return

    const action = await dispatch(updateInvoice({ uuid, dto }))
    if (updateInvoice.fulfilled.match(action)) {
      pushToast({ title: 'Invoice Disimpan', description: `Invoice #${invoice?.invoice_number} berhasil diperbarui.`, variant: 'success' })
      router.push(`/invoice/${uuid}`)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div className="text-xs text-gray-500">Dashboard / Invoice / #{invoice?.invoice_number} / Edit</div>
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
      </div>

      {/* Edit banner */}
      <div className="mb-4 rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
        <Pencil size={16} style={{ color: '#D97706' }} />
        <div>
          <div className="text-sm font-semibold text-amber-800">Mode Edit — Invoice #{invoice?.invoice_number}</div>
          <div className="text-xs text-amber-700">Anda sedang mengedit invoice draft. Perubahan belum disimpan.</div>
        </div>
        <InvoiceStatusBadge status={invoice?.status ?? 'draft'} size="sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Header (partial edit) */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Header Invoice</h2>
            <div className="space-y-4">
              {/* Readonly */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Proyek</label>
                <div className="form-input bg-gray-50 text-gray-500">{invoice?.project.code} — {invoice?.project.name}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Customer</label>
                <div className="form-input bg-gray-50 text-gray-500">{invoice?.customer.name}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">No. Invoice</label>
                <div className="form-input bg-gray-50 text-gray-500 italic font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{invoice?.invoice_number}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Jatuh Tempo *</label>
                <input type="date" className="form-input w-full" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                {isDueDatePast && <p className="text-xs text-amber-600 mt-1">⚠ Tanggal jatuh tempo sudah terlewat</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Catatan ke Customer</label>
                <textarea className="form-input w-full text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Rincian Item</h2>
              <button onClick={addItem} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
                <Plus size={14} />
                Tambah Item
              </button>
            </div>
            {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <InvoiceItemRow
                  key={item.uuid}
                  item={item}
                  index={idx}
                  onChange={updateItem}
                  onRemove={removeItem}
                  errors={errors}
                  onDragStart={i => setDragFrom(i)}
                  onDragOver={i => setDragOver(i)}
                  onDrop={() => {
                    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) reorderItems(dragFrom, dragOver)
                    setDragFrom(null); setDragOver(null)
                  }}
                />
              ))}
            </div>
            <button onClick={addItem} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
              <Plus size={16} />Tambah Item
            </button>
          </div>

          {/* Tax */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Kalkulasi Pajak</h2>
            <InvoiceTaxCalculator
              subtotal={subtotalAmount}
              taxPercent={taxPercent}
              taxEnabled={taxEnabled}
              pphPercent={pphPercent}
              pphEnabled={pphEnabled}
              isPkp={invoice?.customer.is_pkp}
              onToggleTax={e => { setTaxEnabled(e); setTaxPercent(e ? 1.1 : 0) }}
              onChangeTaxPercent={setTaxPercent}
              onTogglePph={e => { setPphEnabled(e); if (e && pphPercent === 0) setPphPercent(2) }}
              onChangePphPercent={setPphPercent}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border p-5 sticky top-20" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Ringkasan</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Sub Total</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(subtotalAmount)}</span></div>
              {taxEnabled && <div className="flex justify-between"><span className="text-gray-500">PPN {taxPercent}%</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>+ {formatRupiah(taxAmount)}</span></div>}
              {pphEnabled && <div className="flex justify-between"><span className="text-gray-500">PPh {pphPercent}%</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#DC2626' }}>− {formatRupiah(pphAmount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
                <span>NETTO</span>
                <span className="font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>{formatRupiah(nettoAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--border-card)' }}>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
          Simpan Perubahan
        </button>
      </div>
      <div className="h-20" />
    </DashboardLayout>
  )
}
