'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
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

interface Props { uuid: string }

export default function ProjectDetailPage({ uuid }: Props) {
  const { selectedProject: project, isLoading, modal, openForm, closeForm, loadDetail, update } = useProject()
  const { customers } = useCustomer()
  const { push: pushToast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'sj' | 'invoice'>('ringkasan')

  useEffect(() => { loadDetail(uuid) }, [uuid, loadDetail])

  const handleMarkDone = async () => {
    if (!project || !confirm('Tandai proyek ini sebagai Selesai?')) return
    await update(project.uuid, { status: 'completed' })
    pushToast({ title: 'Proyek ditandai selesai', variant: 'success' })
  }

  const handleSubmit = async (data: Parameters<typeof update>[1]) => {
    if (!project) return
    const action = await update(project.uuid, data as Partial<Project>)
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal memperbarui proyek', variant: 'error' })
    } else {
      pushToast({ title: 'Proyek diperbarui', variant: 'success' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!project) return (
    <div className="text-center py-32" style={{ color: 'var(--text-secondary)' }}>
      <p>Proyek tidak ditemukan.</p>
    </div>
  )

  const statusCfg = STATUS_CONFIG[project.status]
  const isProfit = project.gross_profit >= 0
  const profitColor = isProfit ? '#16A34A' : '#DC2626'

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-4 hover:underline" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} /> Kembali ke Daftar Proyek
        </button>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-mono text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{project.code}</div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.customer.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>·</span>
                <span className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>{project.contract_number}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}>
                  {statusCfg.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(project.start_date)} → {project.end_date ? formatDate(project.end_date) : 'sedang berjalan'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openForm(project)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>
                <Pencil size={13} /> Edit Proyek
              </button>
              {project.status === 'active' && (
                <button onClick={handleMarkDone} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-all" style={{ backgroundColor: 'var(--green-primary)' }}>
                  <CheckCircle size={13} /> Tandai Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-5">
        {/* Left — Tabs */}
        <div className="col-span-2 space-y-4">
          {/* Tab Bar */}
          <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            {([
              { key: 'ringkasan', label: 'Ringkasan' },
              { key: 'sj', label: `Surat Jalan (${project.sj_count})` },
              { key: 'invoice', label: `Invoice (${project.invoice_count})` },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeTab === tab.key ? 'var(--green-primary)' : 'transparent',
                  color: activeTab === tab.key ? '#FFF' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            {activeTab === 'ringkasan' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Ringkasan Keuangan</h3>
                {[
                  { label: 'Revenue Ditagih', value: project.invoice_outstanding_amount + project.invoice_paid_amount, highlight: false },
                  { label: 'Revenue Terbayar', value: project.invoice_paid_amount, highlight: false },
                  { label: 'Biaya Operasional', value: project.total_operational_cost, highlight: false },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-card)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatRupiah(row.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 rounded-xl px-3 mt-2" style={{ backgroundColor: isProfit ? '#F0FDF4' : '#FFF5F5' }}>
                  <div className="flex items-center gap-2">
                    {isProfit ? <TrendingUp size={16} style={{ color: profitColor }} /> : <TrendingDown size={16} style={{ color: profitColor }} />}
                    <span className="font-semibold text-sm" style={{ color: profitColor }}>Gross Profit</span>
                  </div>
                  <span className="font-bold text-base" style={{ color: profitColor }}>
                    {project.gross_profit < 0 ? '-' : ''}{formatRupiah(Math.abs(project.gross_profit))}
                  </span>
                </div>
                {project.invoice_outstanding_amount > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    * Gross profit dihitung dari invoice PAID. Invoice outstanding sebesar {formatRupiah(project.invoice_outstanding_amount)} belum masuk.
                  </p>
                )}
                {project.description && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>KETERANGAN</div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{project.description}</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'sj' && (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <p className="text-sm">{project.sj_count} Surat Jalan terkait proyek ini</p>
                <p className="text-xs mt-1">{project.sj_delivered_count} sudah terkirim</p>
              </div>
            )}
            {activeTab === 'invoice' && (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <p className="text-sm">{project.invoice_count} Invoice terkait proyek ini</p>
                {project.invoice_outstanding_amount > 0 && (
                  <p className="text-xs mt-1 text-red-600">Outstanding: {formatRupiah(project.invoice_outstanding_amount)}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Informasi Customer</div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{project.customer.name}</div>
            {project.customer.is_pkp && (
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>PKP</span>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Statistik Proyek</div>
            {[
              { label: 'Total Trip', value: `${project.sj_count} SJ` },
              { label: 'Biaya Ops', value: formatRupiah(project.total_operational_cost) },
              { label: 'Rata-rata/Trip', value: project.sj_count > 0 ? formatRupiah(project.total_operational_cost / project.sj_count) : '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
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
