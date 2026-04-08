'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import {
  ArrowLeft,
  Building2,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { RootState } from '@/store'
import { useAgingARCustomerDetail } from '../hooks/useAgingARCustomerDetail'
import { formatRupiah, formatDate } from '@/lib/formatters'
import { ProjectDetailInvoice, ProjectDetailSuratJalan } from '@/features/reports/domain/entities/AgingARProjectDetail'

const INVOICE_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  draft:       { label: 'Draft',       bg: '#F3F4F6', color: '#6B7280', icon: <FileText size={11} /> },
  sent:        { label: 'Terkirim',    bg: '#EFF6FF', color: '#1D4ED8', icon: <FileText size={11} /> },
  outstanding: { label: 'Outstanding', bg: '#FEF3C7', color: '#B45309', icon: <Clock size={11} /> },
  paid:        { label: 'Lunas',       bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={11} /> },
  void:        { label: 'Void',        bg: '#FEE2E2', color: '#B91C1C', icon: <XCircle size={11} /> },
}

const SJ_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     bg: '#F3F4F6', color: '#6B7280', icon: <FileText size={11} /> },
  assigned:  { label: 'Assigned',  bg: '#EFF6FF', color: '#1D4ED8', icon: <Clock size={11} /> },
  delivered: { label: 'Terkirim',  bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={11} /> },
  void:      { label: 'Void',      bg: '#FEE2E2', color: '#B91C1C', icon: <XCircle size={11} /> },
}

const PROJECT_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Aktif', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Selesai', bg: '#F3F4F6', color: '#374151' },
  cancelled: { label: 'Dibatalkan', bg: '#FEE2E2', color: '#B91C1C' },
}

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; bg: string; color: string; icon?: React.ReactNode }> }) {
  const cfg = config[status] ?? { label: status, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {'icon' in cfg && cfg.icon}
      {cfg.label}
    </span>
  )
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border-light)',
        borderRight: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        borderLeft: `4px solid ${accent ?? '#E5E7EB'}`,
      }}
    >
      <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-lg font-bold font-mono" style={{ color: accent ?? 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  )
}

function InvoiceTable({
  invoices,
  totalInvoiced,
  totalPaid,
  totalOutstanding,
}: {
  invoices: ProjectDetailInvoice[]
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
}) {
  const hasOutstanding = totalOutstanding > 0
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--green-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Invoice</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
            {invoices.length}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-light)' }}>
              <th className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>No. Invoice</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Tgl Invoice</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Jatuh Tempo</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Total</th>
              <th className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Terbayar</th>
              <th className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Sisa</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.uuid} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-primary)' }}>#{inv.invoice_number}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.invoice_date)}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.due_date)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={inv.status} config={INVOICE_STATUS_CONFIG} /></td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatRupiah(inv.total_amount)}</td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ color: '#15803D' }}>
                  {inv.paid_amount > 0 ? formatRupiah(inv.paid_amount) : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: inv.remaining_amount > 0 ? '#B45309' : '#15803D' }}>
                  {inv.remaining_amount > 0 ? formatRupiah(inv.remaining_amount) : 'Lunas'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#F3F4F6', borderTop: '2px solid var(--border-light)' }}>
              <td colSpan={4} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                TOTAL ({invoices.length} invoice)
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatRupiah(totalInvoiced)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: '#15803D' }}>
                {formatRupiah(totalPaid)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: hasOutstanding ? '#B45309' : '#15803D' }}>
                {formatRupiah(totalOutstanding)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function SJTable({ suratJalan }: { suratJalan: ProjectDetailSuratJalan[] }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2">
          <Truck size={16} style={{ color: 'var(--green-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Surat Jalan</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
            {suratJalan.length}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-light)' }}>
              <th className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>No. SJ</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Tgl SJ</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Rute</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {suratJalan.map(sj => (
              <tr key={sj.uuid} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-primary)' }}>{sj.sj_number}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{formatDate(sj.sj_date)}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                  <div className="truncate max-w-64">{sj.origin} → {sj.destination}</div>
                </td>
                <td className="px-3 py-2.5"><StatusBadge status={sj.status} config={SJ_STATUS_CONFIG} /></td>
                <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--text-secondary)' }}>{sj.invoice_number ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AgingARCustomerDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useSelector((state: RootState) => state.auth.user)
  const customerIdParam = searchParams.get('customer_id')
  const customerId = customerIdParam ? parseInt(customerIdParam) : null

  const { data, isLoading, error } = useAgingARCustomerDetail(
    Number.isNaN(customerId) ? null : customerId
  )

  useEffect(() => {
    if (user && !['super_admin', 'admin_finance'].includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (user && !['super_admin', 'admin_finance'].includes(user.role)) return null

  if (!customerIdParam || Number.isNaN(Number(customerIdParam))) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} style={{ color: '#DC2626' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Parameter customer tidak valid.</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--green-primary)' }}>
          Kembali
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6', border: '1px solid var(--border-light)' }} />
        <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <XCircle size={40} style={{ color: '#DC2626' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--green-primary)' }}>
          Kembali
        </button>
      </div>
    )
  }

  if (!data) return null

  const hasOutstanding = data.total_outstanding > 0

  return (
    <div className="animate-fadeIn space-y-5">

      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all hover:brightness-95"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <nav className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Laporan</span>
          <span>/</span>
          <a href="/laporan/aging-ar" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>Aging AR</a>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Detail Customer</span>
        </nav>
      </div>

      {/* Customer Header Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-card)',
          borderRight: '1px solid var(--border-card)',
          borderBottom: '1px solid var(--border-card)',
          borderLeft: '4px solid #1E3A1E',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.customer_name}</h1>
              {data.is_pkp && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                  PKP
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>NPWP: <span className="font-mono">{data.npwp ?? '—'}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
              <Building2 size={12} />
              {data.project_count} proyek
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 flex flex-wrap gap-5" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{data.invoice_count} Invoice</span>
            <span>·</span>
            <span>{data.sj_count} Surat Jalan</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Ditagihkan"
          value={formatRupiah(data.total_invoiced)}
          sub={`${data.invoice_count} invoice`}
          accent="#1E3A1E"
        />
        <SummaryCard
          label="Total Terbayar"
          value={formatRupiah(data.total_paid)}
          sub={data.total_paid > 0 ? `${Math.round((data.total_paid / data.total_invoiced) * 100)}% dari total` : 'Belum ada pembayaran'}
          accent="#15803D"
        />
        <SummaryCard
          label="Sisa Tagihan"
          value={hasOutstanding ? formatRupiah(data.total_outstanding) : 'Lunas'}
          sub={hasOutstanding ? 'Belum terbayar' : 'Semua invoice lunas'}
          accent={hasOutstanding ? '#B45309' : '#15803D'}
        />
        <SummaryCard
          label="Total Proyek"
          value={String(data.project_count)}
          sub={`${data.sj_count} surat jalan`}
          accent="#6B7280"
        />
      </div>

      {/* Project Sections */}
      <div className="space-y-4">
        {data.projects.map(project => (
          <ProjectSection key={project.project_id} project={project} />
        ))}
      </div>
    </div>
  )
}

function ProjectSection({
  project,
}: {
  project: {
    project_id: number
    project_name: string
    project_code: string
    contract_number: string
    status: 'active' | 'completed' | 'cancelled'
    total_invoiced: number
    total_paid: number
    total_outstanding: number
    total_operational_cost: number
    invoice_count: number
    sj_count: number
    sj_delivered_count: number
    invoices: ProjectDetailInvoice[]
    surat_jalan: ProjectDetailSuratJalan[]
  }
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = PROJECT_STATUS_CONFIG[project.status]
  const hasOutstanding = project.total_outstanding > 0

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
          <Truck size={18} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{project.project_name}</div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {project.project_code} · {project.contract_number}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--green-primary)' }}
        >
          {expanded ? 'Sembunyikan Detail' : 'Lihat Detail'}
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <SummaryCard label="Total Ditagihkan" value={formatRupiah(project.total_invoiced)} accent="#1D4ED8" />
        <SummaryCard label="Terbayar" value={formatRupiah(project.total_paid)} accent="#15803D" />
        <SummaryCard label="Outstanding" value={hasOutstanding ? formatRupiah(project.total_outstanding) : 'Lunas'} accent={hasOutstanding ? '#B45309' : '#15803D'} />
      </div>

      {expanded && (
        <div className="mt-5 space-y-4">
          <InvoiceTable
            invoices={project.invoices}
            totalInvoiced={project.total_invoiced}
            totalPaid={project.total_paid}
            totalOutstanding={project.total_outstanding}
          />
          <SJTable suratJalan={project.surat_jalan} />
        </div>
      )}
    </div>
  )
}
