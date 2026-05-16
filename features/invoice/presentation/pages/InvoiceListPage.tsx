'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { FilePlus } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import {
  openAttachSJModal, closeAttachSJModal,
  closeDetachSJModal,
  openRecordPaymentModal, closeRecordPaymentModal,
  openSendInvoiceModal, closeSendInvoiceModal,
  openVoidInvoiceModal, closeVoidInvoiceModal,
  openGeneratePDFModal, closeGeneratePDFModal,
  fetchInvoiceDetail, fetchAttachableSJ,
  sendInvoice, voidInvoice, attachSJ, detachSJ,
} from '@/store/slices/invoiceSlice'
import { InvoiceStatus } from '../../domain/entities/Invoice'
import useInvoiceList from '../hooks/useInvoiceList'
import { useToast } from '@/components/toast/useToast'
import InvoiceSummaryCards from '../components/InvoiceSummaryCards'
import InvoiceFilterBar from '../components/InvoiceFilterBar'
import InvoiceTableRow from '../components/InvoiceTableRow'
import SendInvoiceModal from '../components/modals/SendInvoiceModal'
import VoidInvoiceModal from '../components/modals/VoidInvoiceModal'
import RecordPaymentModal from '../components/modals/RecordPaymentModal'
import AttachSJModal from '../components/modals/AttachSJModal'
import DetachSJConfirmModal from '../components/modals/DetachSJConfirmModal'
import GeneratePDFModal from '../components/modals/GeneratePDFModal'
import { exportInvoices } from '../../infrastructure/repositories/MockInvoiceRepository'

export default function InvoiceListPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { list, filters, pagination, isLoading, error, setFilters, resetFilters, setPage, setPerPage } = useInvoiceList()
  const { selectedInvoice, attachableSJ, modals } = useSelector((state: RootState) => state.invoice)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? 'super_admin')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [activeUuid, setActiveUuid] = useState<string | null>(null)

  const currentInvoice = selectedInvoice ?? list.find(i => i.uuid === activeUuid) ?? null

  useEffect(() => {
    if (error) pushToast({ title: 'Kesalahan', description: error, variant: 'error' })
  }, [error, pushToast])

  const stats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const outstanding = list.filter(i => i.status === InvoiceStatus.OUTSTANDING)
    const overdue = outstanding.filter(i => new Date(i.due_date) < now)
    const paidThisMonth = list.filter(i => i.status === InvoiceStatus.PAID && new Date(i.updated_at ?? '') >= startOfMonth)
    const drafts = list.filter(i => i.status === InvoiceStatus.DRAFT)
    return {
      totalPiutang: outstanding.reduce((s, i) => s + i.remaining_amount, 0),
      jatuhTempo: overdue.length,
      terbayarBulanIni: paidThisMonth.reduce((s, i) => s + i.paid_amount, 0),
      draftBelumDikirim: drafts.length,
      countOutstanding: outstanding.length,
      countPaidThisMonth: paidThisMonth.length,
    }
  }, [list])

  const totalPages = Math.ceil(pagination.total / pagination.perPage) || 1

  const handleAction = async (action: string, uuid: string) => {
    if (action === 'detail') return router.push(`/invoice/${uuid}`)
    if (action === 'edit') return router.push(`/invoice/${uuid}/edit`)
    if (action === 'print') {
      setActiveUuid(uuid)
      await dispatch(fetchInvoiceDetail(uuid))
      dispatch(openGeneratePDFModal())
    }
    if (action === 'send') {
      setActiveUuid(uuid)
      await dispatch(fetchInvoiceDetail(uuid))
      dispatch(openSendInvoiceModal())
    }
    if (action === 'payment') {
      setActiveUuid(uuid)
      await dispatch(fetchInvoiceDetail(uuid))
      dispatch(openRecordPaymentModal())
    }
    if (action === 'void') {
      setActiveUuid(uuid)
      await dispatch(fetchInvoiceDetail(uuid))
      dispatch(openVoidInvoiceModal())
    }
    if (action === 'attach-sj') {
      setActiveUuid(uuid)
      const detail = await dispatch(fetchInvoiceDetail(uuid))
      const invoice = fetchInvoiceDetail.fulfilled.match(detail)
        ? detail.payload
        : list.find(i => i.uuid === uuid)
      if (invoice?.service_type === 'rental') {
        pushToast({
          title: 'SJ tidak tersedia',
          description: 'Invoice jasa penyewaan tidak dapat dikaitkan dengan Surat Jalan.',
          variant: 'info',
        })
        return
      }
      const result = await dispatch(fetchAttachableSJ(uuid))
      if (fetchAttachableSJ.rejected.match(result)) {
        pushToast({
          title: 'Gagal memuat SJ tersedia',
          description: (result.payload as string) || 'Daftar Surat Jalan tidak dapat dimuat.',
          variant: 'error',
        })
        return
      }
      dispatch(openAttachSJModal())
    }
  }

  const handleExport = async () => {
    const blob = await exportInvoices()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoice-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Invoice</div>
          <h1 className="text-2xl font-bold">Invoice</h1>
        </div>
        {(role === 'super_admin' || role === 'admin_finance') && (
          <button
            onClick={() => router.push('/invoice/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <FilePlus size={16} />
            Buat Invoice Baru
          </button>
        )}
      </div>

      <InvoiceSummaryCards stats={stats} />

      <div className="mt-6">
        <InvoiceFilterBar filters={filters} onChange={setFilters} onReset={resetFilters} onExport={handleExport} />
      </div>

      <div className="mt-4 rounded-xl overflow-hidden shadow-sm border bg-white" style={{ borderColor: 'var(--border-card)' }}>
        <table className="min-w-full">
          <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left w-8">□</th>
              <th className="px-4 py-3 text-left">No. Invoice</th>
              <th className="px-4 py-3 text-left">Tgl Invoice</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Jatuh Tempo</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading && Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td colSpan={8} className="px-4 py-4">
                  <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                </td>
              </tr>
            ))}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  Tidak ada invoice yang cocok dengan filter ini.
                </td>
              </tr>
            )}
            {!isLoading && list.map(inv => (
              <InvoiceTableRow
                key={inv.uuid}
                invoice={inv}
                checked={selectedRows.includes(inv.uuid)}
                onToggle={uuid => setSelectedRows(prev => prev.includes(uuid) ? prev.filter(u => u !== uuid) : [...prev, uuid])}
                onAction={handleAction}
                role={role}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between mt-6 text-sm">
        <div className="text-gray-500">
          Menampilkan {Math.min((pagination.page - 1) * pagination.perPage + 1, pagination.total)}–{Math.min(pagination.page * pagination.perPage, pagination.total)} dari {pagination.total} invoice
        </div>
        <div className="flex items-center gap-2">
          <button disabled={pagination.page === 1} onClick={() => setPage(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border-card)' }}>← Sebelumnya</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1.5 rounded-lg border ${pagination.page === i + 1 ? 'bg-green-50 text-green-700' : ''}`} style={{ borderColor: 'var(--border-card)' }}>{i + 1}</button>
          ))}
          <button disabled={pagination.page === totalPages} onClick={() => setPage(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border-card)' }}>Berikutnya →</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Tampilkan:</span>
          <select className="form-input text-sm" value={pagination.perPage} onChange={e => setPerPage(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={12}>12</option>
            <option value={25}>25</option>
          </select>
          <span className="text-gray-500">per halaman</span>
        </div>
      </div>

      {/* Modals */}
      <SendInvoiceModal
        open={modals.sendInvoice}
        invoice={currentInvoice}
        onClose={() => dispatch(closeSendInvoiceModal())}
        onConfirm={() => {
          if (!currentInvoice) return
          dispatch(sendInvoice(currentInvoice.uuid)).then(() => pushToast({ title: 'Invoice Dikirim', description: `Invoice #${currentInvoice.invoice_number} sudah dikirim.`, variant: 'success' }))
        }}
      />
      <VoidInvoiceModal
        open={modals.voidInvoice}
        invoice={currentInvoice}
        onClose={() => dispatch(closeVoidInvoiceModal())}
        onConfirm={reason => {
          if (!currentInvoice) return
          dispatch(voidInvoice({ uuid: currentInvoice.uuid, reason })).then(() => pushToast({ title: 'Invoice Void', description: `Invoice #${currentInvoice.invoice_number} telah dibatalkan.`, variant: 'info' }))
        }}
      />
      <RecordPaymentModal
        open={modals.recordPayment}
        invoice={currentInvoice}
        onClose={() => dispatch(closeRecordPaymentModal())}
        onSuccess={newStatus => {
          if (newStatus === InvoiceStatus.PAID) {
            pushToast({ title: `Invoice #${currentInvoice?.invoice_number} LUNAS! 🎉`, description: 'Pembayaran berhasil dicatat.', variant: 'success' })
          } else {
            pushToast({ title: 'Pembayaran Dicatat', description: 'Pembayaran berhasil disimpan.', variant: 'success' })
          }
        }}
      />
      <AttachSJModal
        open={modals.attachSJ}
        invoice={currentInvoice}
        attachableSJ={attachableSJ}
        onClose={() => dispatch(closeAttachSJModal())}
        onConfirm={async sjUuids => {
          if (!currentInvoice) return
          const result = await dispatch(attachSJ({ invoiceUuid: currentInvoice.uuid, sjUuids }))
          if (attachSJ.fulfilled.match(result)) {
            pushToast({ title: 'SJ Dilampirkan', description: `${sjUuids.length} SJ berhasil dilampirkan.`, variant: 'success' })
            return
          }
          pushToast({
            title: 'Gagal melampirkan SJ',
            description: (result.payload as string) || 'Surat Jalan tidak dapat dilampirkan.',
            variant: 'error',
          })
        }}
      />
      <DetachSJConfirmModal
        open={modals.detachSJ.open}
        invoice={currentInvoice}
        sj={currentInvoice?.attached_sj.find(s => s.uuid === modals.detachSJ.sjUuid) ?? null}
        onClose={() => dispatch(closeDetachSJModal())}
        onConfirm={() => {
          if (!currentInvoice || !modals.detachSJ.sjUuid) return
          dispatch(detachSJ({ invoiceUuid: currentInvoice.uuid, sjUuid: modals.detachSJ.sjUuid })).then(() => pushToast({ title: 'SJ Dilepas', description: 'SJ berhasil dilepas dari invoice.', variant: 'info' }))
        }}
      />
      <GeneratePDFModal
        open={modals.generatePDF}
        invoice={currentInvoice}
        onClose={() => dispatch(closeGeneratePDFModal())}
      />
    </DashboardLayout>
  )
}
