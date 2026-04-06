'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Eye, Pencil, CheckCircle, Filter, RotateCcw, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useProject } from '../hooks/useProject'
import { useCustomer } from '../hooks/useCustomer'
import ProjectFormModal from '../components/ProjectFormModal'
import { useToast } from '@/components/toast/useToast'
import { formatRupiah, formatDate } from '@/lib/formatters'
import { Project, ProjectStatus } from '@/features/master/domain/entities/Project'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; bg: string; text: string }> = {
  active:    { label: 'Aktif',   bg: '#D1FAE5', text: '#065F46' },
  completed: { label: 'Selesai', bg: '#F1F5F9', text: '#475569' },
  on_hold:   { label: 'Ditunda', bg: '#FEF3C7', text: '#92400E' },
}

function PLBadge({ value }: { value: number }) {
  if (value === 0) return <span style={{ color: 'var(--text-secondary)' }}>—</span>
  const isProfit = value > 0
  const formatted = Math.abs(value) >= 1_000_000
    ? `Rp ${(Math.abs(value) / 1_000_000).toFixed(1)}Jt`
    : formatRupiah(Math.abs(value))
  return (
    <span className="font-semibold text-sm" style={{ color: isProfit ? '#16A34A' : '#DC2626' }}>
      {isProfit ? '' : '-'}{formatted}
    </span>
  )
}

export default function ProjectListPage() {
  const { projects, isLoading, modal, openForm, closeForm, create, update } = useProject()
  const { customers } = useCustomer()
  const { push: pushToast } = useToast()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')

  const resetFilters = () => { setSearch(''); setFilterCustomer('all'); setFilterStatus('all') }

  const summary = useMemo(() => ({
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    on_hold: projects.filter(p => p.status === 'on_hold').length,
  }), [projects])

  const filtered = useMemo(() => projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.contract_number.toLowerCase().includes(q) ||
      p.customer.name.toLowerCase().includes(q)
    const matchCustomer = filterCustomer === 'all' || String(p.customer_id) === filterCustomer
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchCustomer && matchStatus
  }), [projects, search, filterCustomer, filterStatus])

  const handleSubmit = async (data: Parameters<typeof create>[0]) => {
    const action = modal.data
      ? await update(modal.data.uuid, data as Partial<Project>)
      : await create(data)
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal menyimpan proyek', variant: 'error' })
    } else {
      pushToast({ title: modal.data ? 'Proyek diperbarui' : 'Proyek berhasil dibuat', variant: 'success' })
    }
  }

  const handleMarkDone = async (project: Project) => {
    if (!confirm(`Tandai "${project.name}" sebagai Selesai?`)) return
    await update(project.uuid, { status: 'completed' })
    pushToast({ title: 'Proyek ditandai selesai', variant: 'success' })
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div data-tour="proyek-header" className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span><span>/</span><span>Master Data</span><span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Proyek & Kontrak</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Proyek & Kontrak</h1>
        </div>
        <button data-tour="proyek-add-btn" onClick={() => openForm(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
          <Plus size={15} /> Tambah Proyek
        </button>
      </div>

      {/* Summary Cards */}
      <div data-tour="proyek-summary" className="grid grid-cols-3 gap-4">
        {[
          { count: summary.active, ...STATUS_CONFIG.active },
          { count: summary.completed, ...STATUS_CONFIG.completed },
          { count: summary.on_hold, ...STATUS_CONFIG.on_hold },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.count}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="form-input w-full"
              placeholder="Cari nama, no. kontrak, customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Filter size={14} className="text-gray-500" />
            Filter
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <div className="text-xs text-gray-600">Customer</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
                <option value="all">Semua Customer</option>
                {customers.map(c => <option key={c.uuid} value={String(c.id)}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Status</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
                <option value="on_hold">Ditunda</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">Tidak ada proyek ditemukan</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', backgroundColor: 'var(--bg-page)' }}>
                {['Kode & Nama', 'Customer', 'No. Kontrak', 'Periode', 'SJ', 'Status', 'P&L', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.uuid}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-card)' : 'none',
                    backgroundColor: p.gross_profit < -1000 && p.invoice_paid_amount > 0 ? '#FFF5F5' : undefined,
                  }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>{p.code}</div>
                    <button
                      onClick={() => router.push(`/master/proyek/${p.uuid}`)}
                      className="font-semibold text-sm hover:underline text-left"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.customer.name}</td>
                  <td className="px-4 py-3 text-sm italic" style={{ color: 'var(--text-secondary)' }}>{p.contract_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs" style={{ color: 'var(--text-primary)' }}>{formatDate(p.start_date)}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {p.end_date ? `→ ${formatDate(p.end_date)}` : '→ aktif'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {p.sj_count} SJ · {p.sj_delivered_count} terkirim
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: STATUS_CONFIG[p.status].bg, color: STATUS_CONFIG[p.status].text }}>
                      {STATUS_CONFIG[p.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3"><PLBadge value={p.gross_profit} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/master/proyek/${p.uuid}`)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Lihat Detail">
                        <Eye size={13} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button onClick={() => openForm(p)} className="p-1.5 rounded-lg hover:bg-blue-50" title="Edit">
                        <Pencil size={13} className="text-blue-600" />
                      </button>
                      {p.status === 'active' && (
                        <button onClick={() => handleMarkDone(p)} className="p-1.5 rounded-lg hover:bg-green-50" title="Tandai Selesai">
                          <CheckCircle size={13} className="text-green-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProjectFormModal
        open={modal.open}
        data={modal.data}
        customers={customers}
        isLoading={isLoading}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
