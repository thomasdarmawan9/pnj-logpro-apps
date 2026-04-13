'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Printer, DollarSign, Paperclip, Pencil, Send, AlertTriangle, FileText } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import {
  openAttachSJModal, closeAttachSJModal,
  openDetachSJModal, closeDetachSJModal,
  openRecordPaymentModal, closeRecordPaymentModal,
  openSendInvoiceModal, closeSendInvoiceModal,
  openVoidInvoiceModal, closeVoidInvoiceModal,
  openGeneratePDFModal, closeGeneratePDFModal,
  fetchAttachableSJ, sendInvoice, voidInvoice, attachSJ, detachSJ, updateInvoice,
} from '@/store/slices/invoiceSlice'
import { InvoiceStatus } from '../../domain/entities/Invoice'
import useInvoiceDetail from '../hooks/useInvoiceDetail'
import { useToast } from '@/components/toast/useToast'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'
import PaymentProgressBar from '../components/PaymentProgressBar'
import InvoiceItemsTable from '../components/InvoiceItemsTable'
import AttachedSJList from '../components/AttachedSJList'
import PaymentHistoryList from '../components/PaymentHistoryList'
import SendInvoiceModal from '../components/modals/SendInvoiceModal'
import VoidInvoiceModal from '../components/modals/VoidInvoiceModal'
import RecordPaymentModal from '../components/modals/RecordPaymentModal'
import AttachSJModal from '../components/modals/AttachSJModal'
import DetachSJConfirmModal from '../components/modals/DetachSJConfirmModal'
import GeneratePDFModal from '../components/modals/GeneratePDFModal'
import InvoiceLampiranUploadZone from '../components/InvoiceLampiranUploadZone'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatShortDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props { uuid: string }

export default function DetailInvoicePage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { invoice, isLoading } = useInvoiceDetail(uuid)
  const { attachableSJ, modals } = useSelector((state: RootState) => state.invoice)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? 'super_admin')
  const [activeTab, setActiveTab] = useState<'items' | 'sj' | 'payments' | 'lampiran'>('items')
  const [lampiranPaths, setLampiranPaths] = useState<string[]>([])
  const [isSavingLampiran, setIsSavingLampiran] = useState(false)

  useEffect(() => {
    if (invoice) setLampiranPaths(invoice.lampiran_paths ?? [])
  }, [invoice])

  const now = new Date()
  const isOverdue = invoice?.status === InvoiceStatus.OUTSTANDING && new Date(invoice.due_date) < now
  const overdueCount = isOverdue ? Math.floor((now.getTime() - new Date(invoice!.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0

  if (isLoading || !invoice) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </DashboardLayout>
    )
  }

  const canManage = invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID

  const handleSaveLampiran = async () => {
    setIsSavingLampiran(true)
    await dispatch(updateInvoice({ uuid, dto: { lampiran_paths: lampiranPaths.length > 0 ? lampiranPaths : null } }))
    setIsSavingLampiran(false)
    pushToast({ title: 'Lampiran disimpan', description: 'Dokumen terlampir berhasil diperbarui.', variant: 'success' })
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <button onClick={() => router.push('/invoice')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft size={16} />Kembali ke Daftar
        </button>
        <div className="text-xs text-gray-500">Dashboard / Invoice / #{invoice.invoice_number}</div>
      </div>

      {/* Banners */}
      {isOverdue && (
        <div className="mb-4 rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
          <div className="text-sm text-red-700">
            <strong>Invoice ini telah melewati tanggal jatuh tempo ({formatDate(invoice.due_date)}).</strong>
            <br />Segera hubungi {invoice.customer.name} untuk konfirmasi pembayaran.
            <span className="ml-2 text-xs font-semibold">Terlambat {overdueCount} hari</span>
          </div>
        </div>
      )}
      {invoice.status === InvoiceStatus.VOID && (
        <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: '#450A0A', border: '1px solid #991B1B' }}>
          <div className="text-sm text-red-200 font-semibold">Invoice ini telah di-VOID</div>
          <div className="text-xs text-red-300 mt-1">Alasan: {invoice.void_reason}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Header card */}
          <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-3xl font-bold font-mono" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  Invoice #{invoice.invoice_number}
                </div>
                <div className="text-sm text-gray-500 mt-1">{invoice.customer.name} · {invoice.project.contract_number}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch(openGeneratePDFModal())}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--border-card)' }}
                >
                  <Printer size={14} />
                  Cetak PDF
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-sm text-gray-500">Dibuat {formatShortDate(invoice.invoice_date)}</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">Jatuh Tempo {formatShortDate(invoice.due_date)}</span>
            </div>
            {/* Payment progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-600">Pembayaran</span>
                <span className="font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(invoice.paid_amount)} / {formatRupiah(invoice.total_amount)}</span>
              </div>
              <PaymentProgressBar paidAmount={invoice.paid_amount} totalAmount={invoice.total_amount} isOverdue={isOverdue} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-6" style={{ borderColor: 'var(--border-card)' }}>
            {[
              { id: 'items', label: `Rincian Item (${invoice.items.length})` },
              { id: 'sj', label: `Surat Jalan Terlampir (${invoice.attached_sj.length})` },
              { id: 'payments', label: `Riwayat Pembayaran (${invoice.payments.length})` },
              { id: 'lampiran', label: `Dokumen Terlampir (${(invoice.lampiran_paths ?? []).length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'items' && (
            <div>
              {/* Info header */}
              <div className="rounded-xl p-4 mb-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm" style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--border-card)' }}>
                <div><span className="text-gray-500">Proyek</span><span className="ml-2 font-medium">{invoice.project.name}</span></div>
                <div><span className="text-gray-500">Customer</span><span className="ml-2 font-medium">{invoice.customer.name}</span></div>
                <div><span className="text-gray-500">No. Kontrak</span><span className="ml-2">{invoice.project.contract_number}</span></div>
                <div><span className="text-gray-500">Tgl Invoice</span><span className="ml-2">{formatDate(invoice.invoice_date)}</span></div>
                <div><span className="text-gray-500">Jatuh Tempo</span><span className="ml-2">{formatDate(invoice.due_date)}</span></div>
                <div><span className="text-gray-500">Catatan</span><span className="ml-2 text-gray-500 italic">{invoice.notes || '(kosong)'}</span></div>
              </div>
              <InvoiceItemsTable
                items={invoice.items}
                subtotalAmount={invoice.subtotal_amount}
                taxPercent={invoice.tax_percent}
                taxAmount={invoice.tax_amount}
                totalAmount={invoice.total_amount}
              />
            </div>
          )}

          {activeTab === 'sj' && (
            <AttachedSJList
              attachedSj={invoice.attached_sj}
              invoiceStatus={invoice.status}
              role={role}
              onAttach={async () => {
                await dispatch(fetchAttachableSJ(invoice.project.code))
                dispatch(openAttachSJModal())
              }}
              onDetach={sjUuid => dispatch(openDetachSJModal(sjUuid))}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentHistoryList
              payments={invoice.payments}
              totalAmount={invoice.total_amount}
              paidAmount={invoice.paid_amount}
              invoiceStatus={invoice.status}
              role={role}
              onAddPayment={() => dispatch(openRecordPaymentModal())}
              isOverdue={isOverdue}
            />
          )}

          {activeTab === 'lampiran' && (
            <div className="space-y-4">
              <InvoiceLampiranUploadZone value={lampiranPaths} onChange={setLampiranPaths} />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveLampiran}
                  disabled={isSavingLampiran}
                  className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--green-primary)' }}
                >
                  {isSavingLampiran ? 'Menyimpan...' : 'Simpan Lampiran'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-600">Aksi</h3>
            <div className="space-y-2">
              {invoice.status === InvoiceStatus.DRAFT && (
                <>
                  <button onClick={() => dispatch(openSendInvoiceModal())} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
                    <Send size={14} />Kirim ke Customer
                  </button>
                  <button onClick={() => router.push(`/invoice/${uuid}/edit`)} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border-card)' }}>
                    <Pencil size={14} />Edit Invoice
                  </button>
                </>
              )}
              {(invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OUTSTANDING) && (
                <>
                  <button onClick={() => dispatch(openRecordPaymentModal())} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
                    <DollarSign size={14} />Catat Pembayaran
                  </button>
                  <button onClick={async () => { await dispatch(fetchAttachableSJ(invoice.project.code)); dispatch(openAttachSJModal()); setActiveTab('sj') }} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border-card)' }}>
                    <Paperclip size={14} />Kelola SJ Terlampir
                  </button>
                  <button onClick={() => dispatch(openGeneratePDFModal())} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border-card)' }}>
                    <Printer size={14} />Cetak PDF
                  </button>
                </>
              )}
              {invoice.status === InvoiceStatus.PAID && (
                <>
                  <button onClick={() => dispatch(openGeneratePDFModal())} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
                    <Printer size={14} />Cetak PDF
                  </button>
                  <button onClick={() => setActiveTab('payments')} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border-card)' }}>
                    <FileText size={14} />Lihat Riwayat Bayar
                  </button>
                </>
              )}
              {invoice.status === InvoiceStatus.VOID && (
                <button onClick={() => dispatch(openGeneratePDFModal())} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border-card)' }}>
                  <Printer size={14} />Cetak PDF
                </button>
              )}
              {canManage && role === 'super_admin' && (
                <button onClick={() => dispatch(openVoidInvoiceModal())} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border text-red-600" style={{ borderColor: '#FCA5A5' }}>
                  <AlertTriangle size={14} />Void Invoice
                </button>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-600">Info Customer</h3>
            <div className="text-sm font-semibold">{invoice.customer.name}</div>
            {invoice.customer.address && <div className="text-xs text-gray-500 mt-1">{invoice.customer.address}</div>}
            {invoice.customer.npwp && <div className="text-xs text-gray-500 mt-1">NPWP: {invoice.customer.npwp}</div>}
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: invoice.customer.is_pkp ? '#DCFCE7' : '#F3F4F6', color: invoice.customer.is_pkp ? '#166534' : '#6B7280' }}>
              {invoice.customer.is_pkp ? 'PKP' : 'Non-PKP'}
            </span>
          </div>

          {/* Project info */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-600">Info Proyek</h3>
            <div className="text-sm font-semibold">{invoice.project.name}</div>
            <div className="text-xs text-gray-500 mt-1">{invoice.project.code} · {invoice.project.contract_number}</div>
            <div className="border-t mt-3 pt-3 space-y-1.5 text-xs text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
              <div>SJ di proyek: {invoice.attached_sj.length} SJ</div>
              <div>Invoice aktif: 1 outstanding</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SendInvoiceModal
        open={modals.sendInvoice}
        invoice={invoice}
        onClose={() => dispatch(closeSendInvoiceModal())}
        onConfirm={() => dispatch(sendInvoice(uuid)).then(() => pushToast({ title: 'Invoice Dikirim', description: 'Invoice berhasil dikirim ke customer.', variant: 'success' }))}
      />
      <VoidInvoiceModal
        open={modals.voidInvoice}
        invoice={invoice}
        onClose={() => dispatch(closeVoidInvoiceModal())}
        onConfirm={reason => dispatch(voidInvoice({ uuid, reason })).then(() => pushToast({ title: 'Invoice Void', description: 'Invoice telah dibatalkan.', variant: 'info' }))}
      />
      <RecordPaymentModal
        open={modals.recordPayment}
        invoice={invoice}
        onClose={() => dispatch(closeRecordPaymentModal())}
        onSuccess={newStatus => {
          if (newStatus === InvoiceStatus.PAID) {
            pushToast({ title: `Invoice #${invoice.invoice_number} LUNAS! 🎉`, description: 'Selamat, invoice telah lunas!', variant: 'success' })
          } else {
            pushToast({ title: 'Pembayaran Dicatat', variant: 'success' })
          }
        }}
      />
      <AttachSJModal
        open={modals.attachSJ}
        invoice={invoice}
        attachableSJ={attachableSJ}
        onClose={() => dispatch(closeAttachSJModal())}
        onConfirm={sjUuids => dispatch(attachSJ({ invoiceUuid: uuid, sjUuids })).then(() => pushToast({ title: 'SJ Dilampirkan', description: `${sjUuids.length} SJ berhasil dilampirkan.`, variant: 'success' }))}
      />
      <DetachSJConfirmModal
        open={modals.detachSJ.open}
        invoice={invoice}
        sj={invoice.attached_sj.find(s => s.uuid === modals.detachSJ.sjUuid) ?? null}
        onClose={() => dispatch(closeDetachSJModal())}
        onConfirm={() => {
          if (!modals.detachSJ.sjUuid) return
          dispatch(detachSJ({ invoiceUuid: uuid, sjUuid: modals.detachSJ.sjUuid })).then(() => pushToast({ title: 'SJ Dilepas', variant: 'info' }))
        }}
      />
      <GeneratePDFModal open={modals.generatePDF} invoice={invoice} onClose={() => dispatch(closeGeneratePDFModal())} />
    </DashboardLayout>
  )
}
