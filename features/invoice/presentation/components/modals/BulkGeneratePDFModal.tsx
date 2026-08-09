'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Download, LoaderCircle, Printer, Search, X } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { InvoiceStatus } from '../../../domain/entities/Invoice'
import {
  BulkPdfInvoiceOption,
  BulkInvoicePdfJob,
  downloadPdfJob,
  fetchInvoicesForBulkPdf,
  generateBulkInvoicePdf,
  getPdfJob,
} from '../../../infrastructure/repositories/MockInvoiceRepository'
import { formatDateOnly } from '@/lib/dateOnly'

type PrintStatus = 'queued' | 'processing' | 'downloading' | 'downloaded' | 'failed'

interface PrintProgress {
  status: PrintStatus
  message?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onComplete: (successCount: number, failCount: number) => void
}

const DEFAULT_PDF_OPTIONS = {
  includeLogo: true,
  includeSig: true,
  includeSJ: true,
  includeLampiran: true,
  copies: 3,
  copyLabel: false,
}

const MAX_BULK_PDF_INVOICES = 20

function safeFilenamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

function printableFilename(invoice: BulkPdfInvoiceOption): string {
  return `Invoice_${safeFilenamePart(invoice.invoice_number)}_${safeFilenamePart(invoice.customer.name)}.pdf`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function waitForJob(job: BulkInvoicePdfJob['job']) {
  let latest = job
  let transientFailures = 0
  for (let attempt = 0; attempt < 80 && latest.status !== 'done' && latest.status !== 'failed'; attempt += 1) {
    await new Promise(resolve => window.setTimeout(resolve, 1500))
    try {
      latest = await getPdfJob(job.uuid)
      transientFailures = 0
    } catch (error) {
      transientFailures += 1
      if (transientFailures >= 3) throw error
    }
  }
  return latest
}

export default function BulkGeneratePDFModal({ open, onClose, onComplete }: Props) {
  const [invoices, setInvoices] = useState<BulkPdfInvoiceOption[]>([])
  const [selectedUuids, setSelectedUuids] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [processError, setProcessError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, PrintProgress>>({})
  const processingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    let active = true

    setInvoices([])
    setSelectedUuids([])
    setSearch('')
    setDropdownOpen(false)
    setConfirmOpen(false)
    setIsProcessing(false)
    processingRef.current = false
    setLoadError(null)
    setProcessError(null)
    setProgress({})
    setIsLoading(true)

    fetchInvoicesForBulkPdf()
      .then(data => {
        if (active) setInvoices(data)
      })
      .catch(error => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Gagal memuat daftar invoice.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [open])

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id-ID')
    if (!keyword) return invoices
    return invoices.filter(invoice =>
      invoice.invoice_number.toLocaleLowerCase('id-ID').includes(keyword) ||
      invoice.customer.name.toLocaleLowerCase('id-ID').includes(keyword) ||
      invoice.invoice_date.includes(keyword)
    )
  }, [invoices, search])

  const selectedInvoices = useMemo(() => {
    const byUuid = new Map(invoices.map(invoice => [invoice.uuid, invoice]))
    return selectedUuids.map(uuid => byUuid.get(uuid)).filter((invoice): invoice is BulkPdfInvoiceOption => Boolean(invoice))
  }, [invoices, selectedUuids])

  const completedCount = Object.values(progress).filter(item => item.status === 'downloaded').length
  const failedCount = Object.values(progress).filter(item => item.status === 'failed').length
  const selectionLimitReached = selectedUuids.length >= MAX_BULK_PDF_INVOICES

  const toggleInvoice = (invoice: BulkPdfInvoiceOption) => {
    if (invoice.status === InvoiceStatus.DRAFT || isProcessing) return
    if (!selectedUuids.includes(invoice.uuid) && selectionLimitReached) return
    setSelectedUuids(current => current.includes(invoice.uuid)
      ? current.filter(uuid => uuid !== invoice.uuid)
      : [...current, invoice.uuid])
  }

  const updateProgress = (uuid: string, next: PrintProgress) => {
    setProgress(current => ({ ...current, [uuid]: next }))
  }

  const handlePrint = async () => {
    if (selectedInvoices.length === 0 || processingRef.current) return

    processingRef.current = true
    setConfirmOpen(false)
    setDropdownOpen(false)
    setIsProcessing(true)
    setProcessError(null)
    setProgress(Object.fromEntries(selectedInvoices.map(invoice => [invoice.uuid, { status: 'queued' as const }])))

    let successes = 0
    let failures = 0

    try {
      const batch = await generateBulkInvoicePdf(selectedUuids, DEFAULT_PDF_OPTIONS)
      const jobsByInvoice = new Map(batch.map(entry => [entry.invoice_uuid, entry]))

      // Diproses sesuai urutan pilihan agar download muncul satu per satu dan
      // nama file tetap berpasangan dengan invoice yang benar.
      for (const invoice of selectedInvoices) {
        const entry = jobsByInvoice.get(invoice.uuid)
        if (!entry) {
          failures += 1
          updateProgress(invoice.uuid, { status: 'failed', message: 'Job PDF tidak dibuat.' })
          continue
        }

        try {
          updateProgress(invoice.uuid, { status: 'processing' })
          const finalJob = await waitForJob(entry.job)
          if (finalJob.status !== 'done') {
            throw new Error(finalJob.error_message || 'PDF gagal dibuat atau melewati batas waktu.')
          }

          updateProgress(invoice.uuid, { status: 'downloading' })
          const blob = await downloadPdfJob(entry.job.uuid)
          triggerDownload(blob, printableFilename(invoice))
          successes += 1
          updateProgress(invoice.uuid, { status: 'downloaded' })
          await new Promise(resolve => window.setTimeout(resolve, 300))
        } catch (error) {
          failures += 1
          updateProgress(invoice.uuid, {
            status: 'failed',
            message: error instanceof Error ? error.message : 'Gagal mengunduh PDF.',
          })
        }
      }
    } catch (error) {
      failures = selectedInvoices.length
      const message = error instanceof Error ? error.message : 'Gagal memulai cetak PDF massal.'
      setProcessError(message)
      setProgress(Object.fromEntries(selectedInvoices.map(invoice => [
        invoice.uuid,
        { status: 'failed' as const, message },
      ])))
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      onComplete(successes, failures)
    }
  }

  const closeSafely = () => {
    if (!isProcessing) onClose()
  }

  return (
    <>
      <ModalShell
        open={open}
        onClose={closeSafely}
        title="Cetak PDF Massal"
        subtitle="Pilih invoice yang akan dibuat dan diunduh satu per satu."
        widthClass="max-w-[680px]"
      >
        <div className="space-y-5">
          <div className="relative">
            <label className="text-xs font-medium text-gray-600 block mb-2">Daftar Invoice</label>
            <button
              type="button"
              disabled={isLoading || isProcessing}
              onClick={() => setDropdownOpen(current => !current)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-white text-left disabled:opacity-60"
              style={{ borderColor: 'var(--border-card)' }}
            >
              <span className={selectedUuids.length > 0 ? 'text-sm text-gray-800' : 'text-sm text-gray-400'}>
                {isLoading
                  ? 'Memuat semua invoice...'
                  : selectedUuids.length > 0
                    ? `${selectedUuids.length} invoice dipilih`
                    : 'Pilih satu atau beberapa invoice'}
              </span>
              {isLoading ? <LoaderCircle size={17} className="animate-spin text-gray-400" /> : <ChevronDown size={17} className="text-gray-400" />}
            </button>

            {dropdownOpen && !isLoading && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white shadow-xl overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                <div className="p-3 border-b" style={{ borderColor: 'var(--border-card)' }}>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Cari nomor invoice, customer, atau tanggal..."
                      className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-green-100"
                      style={{ borderColor: 'var(--border-card)' }}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredInvoices.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-gray-500">Invoice tidak ditemukan.</div>
                  )}
                  {filteredInvoices.map(invoice => {
                    const selected = selectedUuids.includes(invoice.uuid)
                    const isDraft = invoice.status === InvoiceStatus.DRAFT
                    const selectionDisabled = isDraft || (!selected && selectionLimitReached)
                    return (
                      <button
                        key={invoice.uuid}
                        type="button"
                        disabled={selectionDisabled}
                        onClick={() => toggleInvoice(invoice)}
                        title={isDraft
                          ? 'Invoice draft belum dapat dicetak.'
                          : selectionDisabled
                            ? `Maksimal ${MAX_BULK_PDF_INVOICES} invoice per proses cetak.`
                            : undefined}
                        className="w-full grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_110px] items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="w-4 h-4 rounded border flex items-center justify-center" style={{ borderColor: selected ? 'var(--green-primary)' : '#D1D5DB', backgroundColor: selected ? 'var(--green-primary)' : '#fff' }}>
                          {selected && <Check size={12} className="text-white" />}
                        </span>
                        <span className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--green-primary)' }}>#{invoice.invoice_number}</span>
                        <span className="text-xs text-gray-700 truncate">{invoice.customer.name}</span>
                        <span className="text-xs text-gray-500 text-right">{formatDateOnly(invoice.invoice_date)}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50" style={{ borderColor: 'var(--border-card)' }}>
                  <span className="text-xs text-gray-500">Draft tidak dapat dipilih · Maksimal {MAX_BULK_PDF_INVOICES} invoice per proses.</span>
                  <button type="button" onClick={() => setDropdownOpen(false)} className="text-xs font-semibold" style={{ color: 'var(--green-primary)' }}>
                    Selesai memilih
                  </button>
                </div>
              </div>
            )}
          </div>

          {loadError && (
            <div className="rounded-xl border px-3 py-2 text-sm text-red-700" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
              {loadError}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Invoice Dipilih</label>
              {selectedInvoices.length > 0 && !isProcessing && (
                <button type="button" onClick={() => setSelectedUuids([])} className="text-xs text-red-600 hover:underline">Hapus semua</button>
              )}
            </div>
            <div className="rounded-xl border max-h-60 overflow-y-auto" style={{ borderColor: 'var(--border-card)' }}>
              {selectedInvoices.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Belum ada invoice dipilih.</div>
              ) : selectedInvoices.map(invoice => {
                const itemProgress = progress[invoice.uuid]
                return (
                  <div key={invoice.uuid} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_auto] items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border-card)' }}>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--green-primary)' }}>#{invoice.invoice_number}</div>
                      {itemProgress && (
                        <div className={`text-[11px] mt-0.5 ${itemProgress.status === 'failed' ? 'text-red-600' : itemProgress.status === 'downloaded' ? 'text-green-700' : 'text-gray-500'}`}>
                          {itemProgress.status === 'queued' && 'Menunggu antrean'}
                          {itemProgress.status === 'processing' && 'Membuat PDF...'}
                          {itemProgress.status === 'downloading' && 'Mengunduh...'}
                          {itemProgress.status === 'downloaded' && 'Berhasil diunduh'}
                          {itemProgress.status === 'failed' && (itemProgress.message || 'Gagal')}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-700 truncate">{invoice.customer.name}</div>
                    <div className="text-xs text-gray-500 text-right">{formatDateOnly(invoice.invoice_date)}</div>
                    {!isProcessing && !itemProgress && (
                      <button type="button" onClick={() => toggleInvoice(invoice)} className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label={`Hapus invoice ${invoice.invoice_number}`}>
                        <X size={15} />
                      </button>
                    )}
                    {(isProcessing || itemProgress) && (
                      <span className="w-6 flex justify-center">
                        {itemProgress?.status === 'downloaded'
                          ? <Check size={16} className="text-green-600" />
                          : itemProgress?.status === 'failed'
                            ? <X size={16} className="text-red-600" />
                            : <LoaderCircle size={16} className="animate-spin text-gray-400" />}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {isProcessing && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
              Memproses {selectedInvoices.length} invoice. Jangan tutup halaman ini. Izinkan multiple downloads jika browser meminta konfirmasi.
            </div>
          )}

          {!isProcessing && Object.keys(progress).length > 0 && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: failedCount > 0 ? '#FEF2F2' : '#F0FDF4', color: failedCount > 0 ? '#B91C1C' : '#166534' }}>
              Selesai: {completedCount} PDF diunduh{failedCount > 0 ? `, ${failedCount} gagal.` : '.'}
            </div>
          )}

          {processError && (
            <div className="rounded-xl border px-3 py-2 text-sm text-red-700" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
              {processError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" disabled={isProcessing} onClick={closeSafely} className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50" style={{ borderColor: 'var(--border-card)' }}>
              {Object.keys(progress).length > 0 && !isProcessing ? 'Tutup' : 'Batal'}
            </button>
            <button
              type="button"
              disabled={selectedInvoices.length === 0 || isLoading || isProcessing}
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Printer size={15} />}
              {isProcessing ? `Mencetak ${completedCount + failedCount}/${selectedInvoices.length}` : 'Cetak PDF'}
            </button>
          </div>
        </div>
      </ModalShell>

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-[440px] mx-4 rounded-2xl bg-white shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#DCFCE7' }}>
              <Download size={23} style={{ color: '#166534' }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Cetak PDF Massal</h3>
            <p className="text-sm text-gray-600 mt-2">
              Cetak dan download {selectedInvoices.length} invoice yang dipilih? Setiap invoice akan diunduh sebagai file PDF terpisah.
            </p>
            <p className="text-xs text-gray-500 mt-2">Pastikan browser mengizinkan multiple downloads untuk situs ini.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
              <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
                <Printer size={15} />
                Ya, Cetak PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
