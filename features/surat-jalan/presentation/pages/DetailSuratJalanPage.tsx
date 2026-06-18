'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import {
  openAssignModal,
  closeAssignModal,
  openUploadPODModal,
  closeUploadPODModal,
  openVoidModal,
  closeVoidModal,
  openGeneratePDFModal,
  closeGeneratePDFModal,
  openAttachInvoiceModal,
  closeAttachInvoiceModal,
  fetchAvailableInvoices,
  fetchSuratJalanDetail,
  attachSuratJalanToInvoice,
  updateSuratJalan,
} from '@/store/slices/suratJalanSlice'
import useSuratJalanDetail from '../hooks/useSuratJalanDetail'
import useSJStatusTransition from '../hooks/useSJStatusTransition'
import SJLampiranUploadZone from '../components/SJLampiranUploadZone'
import SJStatusBadge from '../components/SJStatusBadge'
import SJTimeline from '../components/SJTimeline'
import AssignModal from '../components/modals/AssignModal'
import ConfirmasiTibaModal from '../components/modals/ConfirmasiTibaModal'
import VoidModal from '../components/modals/VoidModal'
import GeneratePDFModal from '../components/modals/GeneratePDFModal'
import AttachToInvoiceModal from '../components/modals/AttachToInvoiceModal'
import { StatusLampiran, StatusOperasional } from '../../domain/entities/SuratJalan'
import { downloadSuratJalanPOD } from '../../infrastructure/repositories/MockSuratJalanRepository'
import { formatLongDate, formatShortDate, formatTimeWIB } from '../utils/format'
import { useToast } from '@/components/toast/useToast'
import { AvailableInvoice } from '@/features/invoice/domain/entities/Invoice'

interface DetailSuratJalanPageProps {
  uuid: string
}

const ITEMS_PER_PAGE = 10

function formatNumber(value: number | string | null | undefined): string {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return '-'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(numeric)
}

export default function DetailSuratJalanPage({ uuid }: DetailSuratJalanPageProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { selectedSJ, isDetailLoading } = useSuratJalanDetail(uuid)
  const { assign, deliver, voidSJ } = useSJStatusTransition()
  const {
    isAssignModalOpen, isUploadPODModalOpen, isVoidModalOpen, isGeneratePDFModalOpen,
    isAttachInvoiceModalOpen, availableInvoices, isLoadingInvoices, isSubmitting,
  } = useSelector((state: RootState) => state.suratJalan)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)

  const [tab, setTab] = useState<'info' | 'lampiran' | 'history'>('info')
  const [lampiranPaths, setLampiranPaths] = useState<string[]>([])
  const [isSavingLampiran, setIsSavingLampiran] = useState(false)
  const [podPhotoSrc, setPodPhotoSrc] = useState<string | null>(null)
  const [itemPage, setItemPage] = useState(1)

  useEffect(() => {
    if (selectedSJ) setLampiranPaths(selectedSJ.lampiran_paths ?? [])
  }, [selectedSJ])

  useEffect(() => {
    setItemPage(1)
  }, [selectedSJ?.uuid, tab])

  useEffect(() => {
    if (!selectedSJ?.uuid || !selectedSJ.pod_photo_path) {
      setPodPhotoSrc(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    downloadSuratJalanPOD(selectedSJ.uuid)
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPodPhotoSrc(objectUrl)
      })
      .catch(() => setPodPhotoSrc(null))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedSJ?.uuid, selectedSJ?.pod_photo_path])

  const handleSaveLampiran = async () => {
    if (!selectedSJ) return
    setIsSavingLampiran(true)
    try {
      const result = await dispatch(updateSuratJalan({
        uuid: selectedSJ.uuid,
        dto: { lampiran_paths: lampiranPaths.length > 0 ? lampiranPaths : null },
      }))
      if (updateSuratJalan.fulfilled.match(result)) {
        pushToast({ title: 'Lampiran disimpan', description: 'Dokumen terlampir berhasil diperbarui.', variant: 'success' })
      } else {
        const msg = (result.payload as string) || 'Gagal menyimpan lampiran.'
        pushToast({ title: 'Gagal', description: msg, variant: 'error' })
      }
    } catch {
      pushToast({ title: 'Gagal', description: 'Terjadi kesalahan saat menyimpan lampiran.', variant: 'error' })
    } finally {
      setIsSavingLampiran(false)
    }
  }

  const handleAttachConfirm = (invoice: AvailableInvoice) => {
    dispatch(attachSuratJalanToInvoice({
      sjUuid: selectedSJ!.uuid,
      invoiceId: invoice.id,
      invoiceUuid: invoice.uuid,
      invoiceNumber: invoice.invoice_number,
      sjEntry: {
        uuid: selectedSJ!.uuid,
        sj_number: selectedSJ!.sj_number,
        sj_date: selectedSJ!.sj_date,
        origin: selectedSJ!.origin,
        destination: selectedSJ!.destination,
        fleet_label: selectedSJ!.fleet ? `${selectedSJ!.fleet.name} ${selectedSJ!.fleet.plate_number}` : '-',
        driver_name: selectedSJ!.driver?.name || selectedSJ!.driver_name_manual || '-',
        status: selectedSJ!.status,
      },
    })).then(result => {
      if (result.meta.requestStatus === 'fulfilled') {
        pushToast({ title: 'Berhasil', description: `SJ dilampirkan ke Invoice No. ${invoice.invoice_number}`, variant: 'success' })
      }
    })
  }

  const events = useMemo(() => {
    if (!selectedSJ) return []
    return [
      {
        id: 1,
        status: selectedSJ.status,
        timestamp: selectedSJ.updated_at,
        actor: 'Admin PNJ',
        note: selectedSJ.status === StatusOperasional.DELIVERED ? 'Foto Bukti Pengiriman telah diupload' : 'Status diperbarui',
      },
      {
        id: 2,
        status: StatusOperasional.ASSIGNED,
        timestamp: selectedSJ.created_at,
        actor: 'Admin PNJ',
        note: 'Armada dan supir ditetapkan',
      },
      {
        id: 3,
        status: StatusOperasional.DRAFT,
        timestamp: selectedSJ.created_at,
        actor: 'Admin PNJ',
        note: 'SJ dibuat',
      },
    ]
  }, [selectedSJ])

  if (isDetailLoading || !selectedSJ) {
    return (
      <DashboardLayout>
        <div className="text-sm text-gray-500">Memuat detail...</div>
      </DashboardLayout>
    )
  }

  const showAttach = selectedSJ.status === StatusOperasional.DELIVERED && selectedSJ.invoice_attachment_status === StatusLampiran.NO_INVOICE
  const sjItems = selectedSJ.items ?? []
  const itemTotalPages = Math.max(1, Math.ceil(sjItems.length / ITEMS_PER_PAGE))
  const safeItemPage = Math.min(itemPage, itemTotalPages)
  const itemStart = (safeItemPage - 1) * ITEMS_PER_PAGE
  const pagedItems = sjItems.slice(itemStart, itemStart + ITEMS_PER_PAGE)

  return (
    <DashboardLayout>
      <div className="text-xs text-gray-500 mb-2">Dashboard / Surat Jalan / {selectedSJ.sj_number}</div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-2xl font-bold">{selectedSJ.sj_number}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SJStatusBadge statusOps={selectedSJ.status} statusLampiran={selectedSJ.invoice_attachment_status} invoiceNumber={selectedSJ.invoice?.invoice_number || null} />
              <div className="text-xs text-gray-400">Dibuat: {formatShortDate(selectedSJ.created_at)}</div>
              <div className="text-xs text-gray-400">Oleh: Admin PNJ</div>
            </div>

            {showAttach && (
              <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', color: '#991B1B' }}>
                SJ ini belum dilampirkan ke invoice manapun. Segera lampirkan agar bisa ditagihkan.
              </div>
            )}

            {selectedSJ.status === StatusOperasional.VOID && (
              <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#DC2626', backgroundColor: '#7F1D1D', color: '#FEE2E2' }}>
                SJ ini sudah VOID. Alasan: {selectedSJ.void_reason}
              </div>
            )}

            <div className="mt-6 flex items-center gap-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
              <button
                className={`pb-2 text-sm ${tab === 'info' ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                onClick={() => setTab('info')}
              >
                Informasi SJ
              </button>
              <button
                className={`pb-2 text-sm ${tab === 'lampiran' ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                onClick={() => setTab('lampiran')}
              >
                Dokumen Terlampir
              </button>
              <button
                className={`pb-2 text-sm ${tab === 'history' ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                onClick={() => setTab('history')}
              >
                Riwayat Status
              </button>
            </div>

            {tab === 'info' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Proyek</div>
                    <div className="text-sm font-semibold">{selectedSJ.project?.name || 'Tanpa proyek'}</div>
                    <div className="text-xs text-gray-500 mt-2">Customer</div>
                    <div className="text-sm">{selectedSJ.customer.name}</div>
                    <div className="text-xs text-gray-500 mt-2">No. Kontrak</div>
                    <div className="text-sm">{selectedSJ.project?.contract_number || '-'}</div>
                    <div className="text-xs text-gray-500 mt-2">Kode Proyek</div>
                    <div className="text-sm">{selectedSJ.project?.code || '-'}</div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Armada</div>
                    <div className="text-sm font-semibold">{selectedSJ.fleet ? `${selectedSJ.fleet.name} (${selectedSJ.fleet.plate_number})` : '-'}</div>
                    <div className="text-xs text-gray-500 mt-2">Supir</div>
                    <div className="text-sm">{selectedSJ.driver?.name || selectedSJ.driver_name_manual || '-'}</div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Asal</div>
                    <div className="text-sm">{selectedSJ.origin}</div>
                    <div className="text-xs text-gray-500 mt-2">Tujuan</div>
                    <div className="text-sm">{selectedSJ.destination}</div>
                    <div className="text-xs text-gray-500 mt-2">Muatan</div>
                    <div className="text-sm">{selectedSJ.cargo_description || '-'}</div>
                    <div className="text-xs text-gray-500 mt-2">Nama Pengirim</div>
                    <div className="text-sm">{selectedSJ.sender_name || '-'}</div>
                    <div className="text-xs text-gray-500 mt-2">Tgl SJ</div>
                    <div className="text-sm">{formatLongDate(selectedSJ.sj_date)}</div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Tiba Pukul</div>
                    <div className="text-sm">{selectedSJ.delivered_at ? `${formatTimeWIB(selectedSJ.delivered_at)} WIB (${formatShortDate(selectedSJ.delivered_at)})` : '-'}</div>
                    <div className="text-xs text-gray-500 mt-2">Catatan</div>
                    <div className="text-sm">{selectedSJ.internal_notes || '-'}</div>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: 'var(--border-card)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-gray-50" style={{ borderColor: 'var(--border-card)' }}>
                    <div>
                      <div className="text-sm font-semibold">Rincian Item / Muatan</div>
                      <div className="text-xs text-gray-500 mt-0.5">{sjItems.length} item tercatat</div>
                    </div>
                    {sjItems.length > 0 && (
                      <div className="text-[11px] text-gray-400">Scroll horizontal untuk melihat semua kolom</div>
                    )}
                  </div>
                  {sjItems.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1080px] w-full table-fixed text-sm">
                          <colgroup>
                            <col className="w-14" />
                            <col className="w-28" />
                            <col className="w-[360px]" />
                            <col className="w-32" />
                            <col className="w-28" />
                            <col className="w-32" />
                            <col className="w-[260px]" />
                          </colgroup>
                          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="px-4 py-3 text-left">No</th>
                              <th className="px-4 py-3 text-left">Sumber</th>
                              <th className="px-4 py-3 text-left">Nama Barang</th>
                              <th className="px-4 py-3 text-right">Jumlah</th>
                              <th className="px-4 py-3 text-right">Berat/kg</th>
                              <th className="px-4 py-3 text-right">Volume/m3</th>
                              <th className="px-4 py-3 text-left">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border-card)' }}>
                            {pagedItems.map((item, index) => (
                              <tr key={item.id || `${itemStart + index}-${item.description}`} className="align-top hover:bg-gray-50/60">
                                <td className="px-4 py-3 text-xs font-medium text-gray-400">{itemStart + index + 1}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600">
                                    {item.source_type === 'stock' ? 'Stok' : 'Manual'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800 whitespace-normal break-words leading-5">{item.stock_item_name || item.description || '-'}</div>
                                  {(item.stock_item_code || item.stock_kategori_name) && (
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {item.stock_item_code && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{item.stock_item_code}</span>}
                                      {item.stock_kategori_name && <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] text-green-700">{item.stock_kategori_name}</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                  {formatNumber(item.qty)}
                                  <span className="ml-1 text-xs font-normal text-gray-400">{item.unit}</span>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700">{formatNumber(item.weight)}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{formatNumber(item.volume)}</td>
                                <td className="px-4 py-3 text-gray-600 whitespace-normal break-words leading-5">{item.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {sjItems.length > ITEMS_PER_PAGE && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm" style={{ borderColor: 'var(--border-card)' }}>
                          <div className="text-xs text-gray-500">
                            Menampilkan {itemStart + 1}-{Math.min(itemStart + ITEMS_PER_PAGE, sjItems.length)} dari {sjItems.length} item
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setItemPage(page => Math.max(1, page - 1))}
                              disabled={safeItemPage <= 1}
                              className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ borderColor: 'var(--border-card)' }}
                            >
                              Sebelumnya
                            </button>
                            <span className="text-xs text-gray-500">Halaman {safeItemPage} / {itemTotalPages}</span>
                            <button
                              type="button"
                              onClick={() => setItemPage(page => Math.min(itemTotalPages, page + 1))}
                              disabled={safeItemPage >= itemTotalPages}
                              className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ borderColor: 'var(--border-card)' }}
                            >
                              Berikutnya
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">Belum ada rincian item.</div>
                  )}
                </div>
              </div>
            )}

            {tab === 'lampiran' && (
              <div className="mt-4 space-y-4">
                {/* POD photo — ditampilkan sebagai salah satu dokumen (read-only) */}
                {selectedSJ.pod_photo_path && (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                    {podPhotoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={podPhotoSrc} alt="Foto Pengiriman" className="w-full max-h-64 object-cover" />
                    ) : (
                      <div className="h-40 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                        Foto tidak dapat dimuat
                      </div>
                    )}
                    <div className="px-3 py-2 flex items-center justify-between bg-gray-50">
                      <div>
                        <div className="text-xs font-medium">Foto Pengiriman</div>
                        <div className="text-[11px] text-gray-400">{formatShortDate(selectedSJ.updated_at)}</div>
                      </div>
                      <button
                        onClick={() => dispatch(openUploadPODModal(selectedSJ.uuid))}
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: 'var(--border-card)' }}
                      >
                        Ganti
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload zone — bisa dipakai untuk semua status */}
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Dokumen Lampiran (maks. 3)</div>
                  <SJLampiranUploadZone value={lampiranPaths} onChange={setLampiranPaths} sjUuid={selectedSJ.uuid} />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveLampiran}
                    disabled={isSavingLampiran}
                    className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-60"
                    style={{ backgroundColor: 'var(--green-primary)' }}
                  >
                    {isSavingLampiran ? 'Menyimpan...' : 'Simpan Lampiran'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="mt-4">
                <SJTimeline events={events} />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-white p-5 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-3">Aksi Utama</div>
            {selectedSJ.status === StatusOperasional.DRAFT && (
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--green-primary)' }}
                  onClick={() => dispatch(openAssignModal(selectedSJ.uuid))}
                >
                  Assign & Terbitkan
                </button>
                <button className="w-full px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }} onClick={() => router.push(`/surat-jalan/${selectedSJ.uuid}/edit`)}>
                  Edit SJ
                </button>
                <button className="w-full px-4 py-2 rounded-lg border text-red-600" style={{ borderColor: 'var(--border-card)' }}>
                  Hapus Draft
                </button>
              </div>
            )}
            {selectedSJ.status === StatusOperasional.ASSIGNED && (
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--green-primary)' }}
                  onClick={() => dispatch(openGeneratePDFModal(selectedSJ.uuid))}
                >
                  Cetak PDF SJ
                </button>
                <button
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--green-primary)' }}
                  onClick={() => dispatch(openUploadPODModal(selectedSJ.uuid))}
                >
                  Konfirmasi Tiba & Pengiriman
                </button>
                <button className="w-full px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }} onClick={() => router.push(`/surat-jalan/${selectedSJ.uuid}/edit`)}>
                  Edit SJ
                </button>
                {role === 'super_admin' && (
                  <button
                    className="w-full px-4 py-2 rounded-lg border text-red-600"
                    style={{ borderColor: 'var(--border-card)' }}
                    onClick={() => dispatch(openVoidModal(selectedSJ.uuid))}
                  >
                    Void SJ
                  </button>
                )}
              </div>
            )}
            {selectedSJ.status === StatusOperasional.DELIVERED && (
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--green-primary)' }}
                  onClick={() => dispatch(openGeneratePDFModal(selectedSJ.uuid))}
                >
                  Cetak PDF SJ
                </button>
                {showAttach && (
                  <button
                    className="w-full px-4 py-2 rounded-lg border text-blue-700"
                    style={{ borderColor: 'var(--border-card)' }}
                    onClick={() => {
                      dispatch(openAttachInvoiceModal(selectedSJ.uuid))
                      dispatch(fetchAvailableInvoices({ projectId: selectedSJ.project_id, customerId: selectedSJ.customer_id, sjUuid: selectedSJ.uuid }))
                    }}
                  >
                    Lampirkan ke Invoice
                  </button>
                )}
                {role === 'super_admin' && (
                  <button
                    className="w-full px-4 py-2 rounded-lg border text-red-600"
                    style={{ borderColor: 'var(--border-card)' }}
                    onClick={() => dispatch(openVoidModal(selectedSJ.uuid))}
                  >
                    Void SJ
                  </button>
                )}
              </div>
            )}
            {selectedSJ.status === StatusOperasional.VOID && (
              <div className="rounded-lg border px-3 py-2 text-sm text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                SJ void tidak dapat dicetak PDF.
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-3">Info Invoice Terlampir</div>
            {selectedSJ.invoice_attachment_status === StatusLampiran.NO_INVOICE ? (
              <div className="text-sm text-gray-500">
                Belum dilampirkan ke invoice.
                <div>
                  <button
                    className="mt-3 px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--border-card)' }}
                    onClick={() => {
                      dispatch(openAttachInvoiceModal(selectedSJ.uuid))
                      dispatch(fetchAvailableInvoices({ projectId: selectedSJ.project_id, customerId: selectedSJ.customer_id, sjUuid: selectedSJ.uuid }))
                    }}
                  >
                    Lampirkan ke Invoice
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}>
                <div className="font-semibold">Invoice Terlampir</div>
                <div className="text-xs text-gray-500 mt-1">No. Invoice</div>
                <div className="text-sm">{selectedSJ.invoice?.invoice_number}</div>
                <div className="text-xs text-gray-500 mt-1">Customer</div>
                <div className="text-sm">{selectedSJ.customer.name}</div>
                <div className="text-xs text-gray-500 mt-1">Status Inv</div>
                <div className="text-sm">OUTSTANDING</div>
                <button className="text-sm text-green-700 mt-3">Lihat Detail Invoice →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AssignModal
        open={isAssignModalOpen}
        sj={selectedSJ}
        onClose={() => dispatch(closeAssignModal())}
        onConfirm={input => assign(selectedSJ.uuid, input)}
      />

      <ConfirmasiTibaModal
        open={isUploadPODModalOpen}
        sj={selectedSJ}
        onClose={() => dispatch(closeUploadPODModal())}
        onConfirm={input => {
          if (selectedSJ.status === StatusOperasional.DELIVERED) {
            dispatch(closeUploadPODModal())
            dispatch(fetchSuratJalanDetail(selectedSJ.uuid))
            pushToast({ title: 'Foto disimpan', description: 'Foto bukti pengiriman berhasil diperbarui.', variant: 'success' })
            return
          }
          deliver(selectedSJ.uuid, input)
        }}
      />

      <VoidModal
        open={isVoidModalOpen}
        sj={selectedSJ}
        onClose={() => dispatch(closeVoidModal())}
        onConfirm={(reason, confirmation) => {
          if (confirmation !== 'VOID') return
          voidSJ(selectedSJ.uuid, reason)
        }}
      />

      <GeneratePDFModal
        open={isGeneratePDFModalOpen}
        sj={selectedSJ}
        onClose={() => dispatch(closeGeneratePDFModal())}
      />

      <AttachToInvoiceModal
        open={isAttachInvoiceModalOpen}
        sj={selectedSJ}
        availableInvoices={availableInvoices}
        isLoadingInvoices={isLoadingInvoices}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeAttachInvoiceModal())}
        onConfirm={handleAttachConfirm}
      />
    </DashboardLayout>
  )
}
