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
  Download,
  Printer,
} from 'lucide-react'
import { RootState } from '@/store'
import { useAgingARCustomerDetail } from '../hooks/useAgingARCustomerDetail'
import { formatRupiah, formatDate } from '@/lib/formatters'
import { ProjectDetailInvoice, ProjectDetailSuratJalan } from '@/features/reports/domain/entities/AgingARProjectDetail'
import {
  exportAgingARCustomerExcel,
  exportAgingARCustomerPdf,
} from '@/features/reports/infrastructure/repositories/MockReportsRepository'

const INVOICE_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  draft:       { label: 'Draft',       bg: '#F3F4F6', color: '#6B7280', icon: <FileText size={11} /> },
  sent:        { label: 'Terbit',      bg: '#EFF6FF', color: '#1D4ED8', icon: <FileText size={11} /> },
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
  on_hold: { label: 'Ditunda', bg: '#FEF3C7', color: '#B45309' },
  customer_only: { label: 'Proyek Customer', bg: '#EFF6FF', color: '#1D4ED8' },
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_\-.]/g, '_')
}

function resolveServiceLabel(serviceType: string, customName: string | null): string {
  if (serviceType === 'delivery') return 'Pengiriman'
  if (serviceType === 'rental') return 'Penyewaan'
  if (serviceType === 'other') return customName || 'Lainnya'
  return customName || serviceType || '-'
}

function InvoiceTable({
  invoices,
  suratJalan,
  totalInvoiced,
  totalPaid,
  totalOutstanding,
}: {
  invoices: ProjectDetailInvoice[]
  suratJalan: ProjectDetailSuratJalan[]
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
}) {
  const hasOutstanding = totalOutstanding > 0

  // Build SJ lookup by sj_number for route resolution
  const sjByNumber = Object.fromEntries(suratJalan.map(sj => [sj.sj_number, sj]))

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
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Jasa</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Rincian Item</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Rute Pengiriman</th>
              <th className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Detail Nominal</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const isPaid = inv.status === 'paid' || inv.remaining_amount <= 0

              // Rincian item: "Deskripsi - qty unit - keterangan" per item, joined by newline
              const rincianItems = inv.items.map(it => {
                const parts = [it.description || '-', `${it.qty} ${it.unit}`]
                if (it.cargo_notes) parts.push(it.cargo_notes)
                return parts.join(' - ')
              })

              // Rute pengiriman from attached SJs
              const routes = inv.attached_sj_numbers
                .map(num => sjByNumber[num])
                .filter(Boolean)
                .map(sj => `${sj.origin} → ${sj.destination}`)
                .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate

              return (
              <tr key={inv.uuid} className="border-t" style={{ borderColor: '#E5E7EB', backgroundColor: isPaid ? '#F0FDF4' : undefined }}>
                <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-primary)' }}>#{inv.invoice_number}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.invoice_date)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.due_date)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={inv.status} config={INVOICE_STATUS_CONFIG} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {resolveServiceLabel(inv.service_type, inv.custom_service_name)}
                </td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)', minWidth: 200 }}>
                  {rincianItems.length > 0
                    ? rincianItems.map((line, i) => (
                        <div key={i} className="leading-relaxed">{line}</div>
                      ))
                    : <span style={{ color: '#D1D5DB' }}>—</span>
                  }
                </td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)', minWidth: 160 }}>
                  {routes.length > 0
                    ? routes.map((route, i) => (
                        <div key={i} className="leading-relaxed">{route}</div>
                      ))
                    : <span style={{ color: '#D1D5DB' }}>—</span>
                  }
                </td>
                <td className="px-3 py-2.5 text-right" style={{ minWidth: 160 }}>
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-3">
                      <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                      <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatRupiah(inv.total_amount)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span style={{ color: 'var(--text-secondary)' }}>Terbayar</span>
                      <span className="font-mono" style={{ color: '#15803D' }}>
                        {inv.paid_amount > 0 ? formatRupiah(inv.paid_amount) : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </span>
                    </div>
                    {inv.has_down_payment && (inv.down_payment_amount ?? 0) > 0 && (
                      <div className="flex justify-between gap-3">
                        <span style={{ color: 'var(--text-secondary)' }}>DP</span>
                        <span className="font-mono text-[11px]" style={{ color: '#166534' }}>{formatRupiah(inv.down_payment_amount ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3 pt-0.5" style={{ borderTop: '1px solid #E5E7EB' }}>
                      <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Sisa</span>
                      <span className="font-mono font-bold" style={{ color: inv.remaining_amount > 0 ? '#B45309' : '#15803D' }}>
                        {inv.remaining_amount > 0 ? formatRupiah(inv.remaining_amount) : 'Lunas'}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#F3F4F6', borderTop: '2px solid var(--border-light)' }}>
              <td colSpan={7} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                TOTAL ({invoices.length} invoice)
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="space-y-0.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Total</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{formatRupiah(totalInvoiced)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Terbayar</span>
                    <span className="font-mono font-bold" style={{ color: '#15803D' }}>{formatRupiah(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between gap-3 pt-0.5" style={{ borderTop: '1px solid #D1D5DB' }}>
                    <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Sisa</span>
                    <span className="font-mono font-bold" style={{ color: hasOutstanding ? '#B45309' : '#15803D' }}>
                      {hasOutstanding ? formatRupiah(totalOutstanding) : 'Lunas'}
                    </span>
                  </div>
                </div>
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
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
  const nonProjectSection = data.projects.find(project => project.project_id === null)
  const actualProjectCount = data.projects.filter(project => project.project_id !== null).length
  const exportFilenameBase = `aging-ar-customer-${safeFilename(data.customer_name)}-${new Date().toISOString().slice(0, 10)}`

  const handleExportExcel = async () => {
    if (!customerId) return
    setExportError(null)
    setIsExportingExcel(true)
    try {
      const blob = await exportAgingARCustomerExcel(customerId)
      downloadBlob(blob, `${exportFilenameBase}.xlsx`)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal export Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    if (!customerId) return
    setExportError(null)
    setIsExportingPdf(true)
    try {
      const blob = await exportAgingARCustomerPdf(customerId)
      downloadBlob(blob, `${exportFilenameBase}.pdf`)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal cetak PDF.')
    } finally {
      setIsExportingPdf(false)
    }
  }

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
              {actualProjectCount} proyek
              {nonProjectSection ? ' + proyek customer' : ''}
            </div>
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || isExportingPdf}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:brightness-95 disabled:opacity-60"
              style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
            >
              <Download size={12} />
              {isExportingExcel ? 'Mengekspor...' : 'Export Excel'}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingExcel || isExportingPdf}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:brightness-95 disabled:opacity-60"
              style={{ backgroundColor: 'var(--green-primary)', border: '1px solid var(--green-primary)', color: '#FFFFFF' }}
            >
              <Printer size={12} />
              {isExportingPdf ? 'Mencetak...' : 'Cetak PDF'}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 flex flex-wrap gap-5" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{data.invoice_count} Invoice</span>
            <span>·</span>
            <span>{data.sj_count} Surat Jalan</span>
          </div>
        </div>
        {exportError && (
          <div className="mt-3 text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            {exportError}
          </div>
        )}
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
          value={String(actualProjectCount)}
          sub={`${data.sj_count} surat jalan${nonProjectSection ? ' termasuk proyek customer' : ''}`}
          accent="#6B7280"
        />
      </div>

      {/* Project Sections */}
      <div className="space-y-4">
        {data.projects.map(project => (
          <ProjectSection key={project.project_id ?? 'non-project'} project={project} />
        ))}
      </div>
    </div>
  )
}

function ProjectSection({
  project,
}: {
  project: {
    project_id: number | null
    customer_id: number
    project_name: string
    project_code: string
    contract_number: string
    status: 'active' | 'completed' | 'cancelled' | 'on_hold' | 'customer_only'
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
  const isNonProject = project.project_id === null

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
          {isNonProject
            ? <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
            : <Truck size={18} style={{ color: 'var(--text-secondary)' }} />
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{project.project_name}</div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {isNonProject ? 'Invoice dan SJ berdasarkan permintaan jasa langsung' : `${project.project_code} · ${project.contract_number || 'Tanpa kontrak'}`}
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
        <a
          href={isNonProject
            ? `/laporan/aging-ar/detail?customer_id=${project.customer_id}&scope=non_project`
            : `/laporan/aging-ar/detail?project_id=${project.project_id}`}
          className="text-xs font-medium px-3 py-1.5 rounded-xl hover:brightness-95"
          style={{ backgroundColor: '#F0FDF4', color: 'var(--green-primary)' }}
        >
          Buka Halaman Detail
        </a>
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
            suratJalan={project.surat_jalan}
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
