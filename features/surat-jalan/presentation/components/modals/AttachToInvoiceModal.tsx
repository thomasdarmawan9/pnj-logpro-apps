'use client'

import { useState } from 'react'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'
import ModalShell from './ModalShell'
import { SuratJalan } from '../../../domain/entities/SuratJalan'
import { AvailableInvoice, InvoiceStatus } from '../../../../../features/invoice/domain/entities/Invoice'

interface AttachToInvoiceModalProps {
  open: boolean
  sj: SuratJalan | null
  availableInvoices: AvailableInvoice[]
  isLoadingInvoices: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (invoice: AvailableInvoice) => void
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
  draft:       { label: 'Draft',       bg: '#F1F5F9', text: '#475569' },
  sent:        { label: 'Terkirim',    bg: '#EFF6FF', text: '#1D4ED8' },
  outstanding: { label: 'Outstanding', bg: '#FEF9C3', text: '#92400E' },
  paid:        { label: 'Lunas',       bg: '#D1FAE5', text: '#065F46' },
  void:        { label: 'Void',        bg: '#FEE2E2', text: '#991B1B' },
}

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AttachToInvoiceModal({
  open, sj, availableInvoices, isLoadingInvoices, isSubmitting, onClose, onConfirm,
}: AttachToInvoiceModalProps) {
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  const selected = availableInvoices.find(inv => inv.uuid === selectedUuid) ?? null

  function handleClose() {
    setSelectedUuid(null)
    onClose()
  }

  function handleConfirm() {
    if (!selected) return
    onConfirm(selected)
    setSelectedUuid(null)
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Lampirkan ke Invoice"
      subtitle={sj ? `${sj.sj_number} · ${sj.project?.name || sj.customer.name}` : undefined}
      widthClass="max-w-[560px]"
    >
      <div className="space-y-4">
        {/* Info box */}
        <div className="flex gap-2 rounded-lg border px-3 py-2.5 text-xs"
          style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            Hanya invoice dari {sj?.project ? <>proyek <strong>{sj.project.name}</strong></> : <>customer <strong>{sj?.customer.name}</strong> tanpa proyek</>} yang belum memiliki lampiran SJ ini yang ditampilkan.
          </span>
        </div>

        {/* List invoice */}
        {isLoadingInvoices ? (
          <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Memuat daftar invoice...
          </div>
        ) : availableInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-gray-500 gap-2">
            <FileText size={32} className="text-gray-300" />
            <div>Tidak ada invoice yang tersedia untuk proyek ini.</div>
            <div className="text-xs text-gray-400">Buat invoice baru terlebih dahulu di menu Invoice.</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {availableInvoices.map(inv => {
              const cfg = STATUS_CONFIG[inv.status]
              const isSelected = inv.uuid === selectedUuid
              return (
                <button
                  key={inv.uuid}
                  onClick={() => setSelectedUuid(isSelected ? null : inv.uuid)}
                  className="w-full text-left rounded-xl border px-4 py-3 transition-all"
                  style={{
                    borderColor: isSelected ? 'var(--green-primary)' : 'var(--border-card)',
                    backgroundColor: isSelected ? '#F0FDF4' : '#fff',
                    boxShadow: isSelected ? '0 0 0 2px var(--green-primary)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="font-mono font-semibold text-sm" style={{ color: isSelected ? 'var(--green-primary)' : '#111827' }}>
                        No. {inv.invoice_number}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: isSelected ? 'var(--green-primary)' : '#D1D5DB', backgroundColor: isSelected ? 'var(--green-primary)' : '#fff' }}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Tgl: {formatDate(inv.invoice_date)}</span>
                    <span>Jatuh tempo: {formatDate(inv.due_date)}</span>
                    <span>Total: {formatRupiah(inv.total_amount)}</span>
                    {inv.remaining_amount < inv.total_amount && (
                      <span>Sisa: {formatRupiah(inv.remaining_amount)}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border-card)' }}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: selected && !isSubmitting ? 'var(--green-primary)' : '#86EFAC' }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {selected ? `Lampirkan ke Invoice No. ${selected.invoice_number}` : 'Pilih Invoice'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
