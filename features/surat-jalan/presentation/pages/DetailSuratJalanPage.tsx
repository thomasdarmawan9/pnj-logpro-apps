'use client'

import { useMemo, useState } from 'react'
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
} from '@/store/slices/suratJalanSlice'
import useSuratJalanDetail from '../hooks/useSuratJalanDetail'
import useSJStatusTransition from '../hooks/useSJStatusTransition'
import SJStatusBadge from '../components/SJStatusBadge'
import SJTimeline from '../components/SJTimeline'
import AssignModal from '../components/modals/AssignModal'
import ConfirmasiTibaModal from '../components/modals/ConfirmasiTibaModal'
import VoidModal from '../components/modals/VoidModal'
import GeneratePDFModal from '../components/modals/GeneratePDFModal'
import { StatusLampiran, StatusOperasional } from '../../domain/entities/SuratJalan'
import { formatLongDate, formatRupiah, formatShortDate, formatTimeWIB } from '../utils/format'
import { useToast } from '@/components/toast/useToast'

interface DetailSuratJalanPageProps {
  uuid: string
}

export default function DetailSuratJalanPage({ uuid }: DetailSuratJalanPageProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { selectedSJ, isDetailLoading } = useSuratJalanDetail(uuid)
  const { assign, deliver, voidSJ } = useSJStatusTransition()
  const { isAssignModalOpen, isUploadPODModalOpen, isVoidModalOpen, isGeneratePDFModalOpen } = useSelector((state: RootState) => state.suratJalan)
  const role = useSelector((state: RootState) => state.auth.user?.role || 'super_admin')

  const [tab, setTab] = useState<'info' | 'pod' | 'history'>('info')

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
                className={`pb-2 text-sm ${tab === 'pod' ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                onClick={() => setTab('pod')}
              >
                Foto Bukti Pengiriman
              </button>
              <button
                className={`pb-2 text-sm ${tab === 'history' ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                onClick={() => setTab('history')}
              >
                Riwayat Status
              </button>
            </div>

            {tab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Proyek</div>
                  <div className="text-sm font-semibold">{selectedSJ.project.name}</div>
                  <div className="text-xs text-gray-500 mt-2">Customer</div>
                  <div className="text-sm">{selectedSJ.customer.name}</div>
                  <div className="text-xs text-gray-500 mt-2">No. Kontrak</div>
                  <div className="text-sm">{selectedSJ.project.contract_number}</div>
                  <div className="text-xs text-gray-500 mt-2">Kode Proyek</div>
                  <div className="text-sm">{selectedSJ.project.code}</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Armada</div>
                  <div className="text-sm font-semibold">{selectedSJ.fleet.name} ({selectedSJ.fleet.plate_number})</div>
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
                  <div className="text-xs text-gray-500 mt-2">Tgl SJ</div>
                  <div className="text-sm">{formatLongDate(selectedSJ.sj_date)}</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Biaya Ops</div>
                  <div className="text-sm font-mono">{formatRupiah(selectedSJ.operational_cost)}</div>
                  <div className="text-xs text-gray-500 mt-2">Tiba Pukul</div>
                  <div className="text-sm">{selectedSJ.delivered_at ? `${formatTimeWIB(selectedSJ.delivered_at)} WIB (${formatShortDate(selectedSJ.delivered_at)})` : '-'}</div>
                  <div className="text-xs text-gray-500 mt-2">Catatan</div>
                  <div className="text-sm">{selectedSJ.internal_notes || '-'}</div>
                </div>
              </div>
            )}

            {tab === 'pod' && (
              <div className="mt-4">
                {!selectedSJ.pod_photo_path ? (
                  <div className="text-center text-sm text-gray-500 py-8">
                    Belum ada foto bukti pengiriman.
                    {selectedSJ.status === StatusOperasional.DELIVERED && (
                      <div className="mt-3">
                        <button
                          onClick={() => dispatch(openUploadPODModal(selectedSJ.uuid))}
                          className="px-4 py-2 rounded-lg text-white"
                          style={{ backgroundColor: 'var(--green-primary)' }}
                        >
                          Upload Foto Bukti Pengiriman
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedSJ.pod_photo_path} alt="Bukti Pengiriman" className="rounded-xl w-full" />
                    <div className="text-xs text-gray-500 mt-2">Foto Bukti Pengiriman · {formatShortDate(selectedSJ.updated_at)}</div>
                    <button
                      onClick={() => dispatch(openUploadPODModal(selectedSJ.uuid))}
                      className="mt-3 px-4 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--border-card)' }}
                    >
                      Ganti Foto Bukti Pengiriman
                    </button>
                  </div>
                )}
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
                  onClick={() => dispatch(openUploadPODModal(selectedSJ.uuid))}
                >
                  Konfirmasi Tiba + Upload Foto Bukti Pengiriman
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
                    onClick={() => pushToast({ title: 'Simulasi', description: 'Lampirkan ke Invoice belum diimplementasikan', variant: 'info' })}
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
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--green-primary)' }}
                  onClick={() => dispatch(openGeneratePDFModal(selectedSJ.uuid))}
                >
                  Cetak PDF SJ
                </button>
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
                    onClick={() => pushToast({ title: 'Simulasi', description: 'Lampirkan ke Invoice belum diimplementasikan', variant: 'info' })}
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

          <div className="rounded-xl bg-white p-5 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-3">Quick Stats Proyek</div>
            <div className="text-xs text-gray-500">Revenue proyek ini</div>
            <div className="text-sm">Rp 120.000.000</div>
            <div className="text-xs text-gray-500 mt-2">Biaya ops proyek ini</div>
            <div className="text-sm">Rp 45.000.000</div>
            <div className="text-xs text-gray-500 mt-2">Estimasi margin</div>
            <div className="text-sm">Rp 75.000.000</div>
            <button className="text-sm text-green-700 mt-3">Lihat Laporan P&L →</button>
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
        onConfirm={input => deliver(selectedSJ.uuid, input)}
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
    </DashboardLayout>
  )
}
