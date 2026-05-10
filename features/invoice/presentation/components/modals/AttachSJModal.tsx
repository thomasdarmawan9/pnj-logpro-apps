'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice, AttachedSJ } from '../../../domain/entities/Invoice'

interface Props {
  open: boolean
  invoice: Invoice | null
  attachableSJ: AttachedSJ[]
  onClose: () => void
  onConfirm: (sjUuids: string[]) => void
}

const SJ_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  delivered: { label: 'DELIVERED', color: '#166534' },
  assigned:  { label: 'ASSIGNED',  color: '#1E40AF' },
  draft:     { label: 'DRAFT',     color: '#6B7280' },
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export default function AttachSJModal({ open, invoice, attachableSJ, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) { setSelected([]); setSearch('') }
  }, [open])

  const alreadyAttached = new Set(invoice?.attached_sj.map(s => s.uuid) ?? [])
  const available = attachableSJ.filter(sj => !alreadyAttached.has(sj.uuid))
  const filtered = available.filter(sj => {
    if (!search) return true
    const q = search.toLowerCase()
    return sj.sj_number.toLowerCase().includes(q) || sj.fleet_label.toLowerCase().includes(q) || (sj.driver_name ?? '').toLowerCase().includes(q)
  })

  const toggle = (uuid: string) => {
    setSelected(prev => prev.includes(uuid) ? prev.filter(u => u !== uuid) : [...prev, uuid])
  }

  const handleConfirm = () => {
    if (selected.length === 0) return
    onConfirm(selected)
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Lampirkan Surat Jalan" subtitle={`ke Invoice #${invoice?.invoice_number} · ${invoice?.customer.name}`} widthClass="max-w-[640px]">
      <div className="space-y-4">
        <div className="rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
          Hanya SJ dari proyek &ldquo;{invoice?.project.name}&rdquo; yang belum dilampirkan ke invoice lain yang ditampilkan.
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border-card)' }}>
          <Search size={14} className="shrink-0 text-gray-400" />
          <input
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
            placeholder="Cari no. SJ, armada, supir..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left w-8"></th>
                <th className="px-3 py-2 text-left">No. SJ</th>
                <th className="px-3 py-2 text-left">Tgl</th>
                <th className="px-3 py-2 text-left">Armada</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">Tidak ada SJ tersedia</td></tr>
              )}
              {filtered.map(sj => {
                const conf = SJ_STATUS_CONFIG[sj.status] ?? SJ_STATUS_CONFIG.draft
                return (
                  <tr key={sj.uuid} className="border-t hover:bg-gray-50 cursor-pointer" style={{ borderColor: 'var(--border-card)' }} onClick={() => toggle(sj.uuid)}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(sj.uuid)}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggle(sj.uuid)}
                        className="rounded cursor-pointer"
                        aria-label={`Pilih ${sj.sj_number}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-primary)' }}>{sj.sj_number}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{formatDate(sj.sj_date)}</td>
                    <td className="px-3 py-2.5 text-xs">{sj.fleet_label}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${conf.color}18`, color: conf.color }}>{conf.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {selected.length > 0 && <div className="text-sm text-gray-500">{selected.length} SJ dipilih</div>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
          <button
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:cursor-not-allowed"
            style={{ backgroundColor: selected.length > 0 ? 'var(--green-primary)' : '#A7F3D0' }}
          >
            Lampirkan SJ yang Dipilih ({selected.length})
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
