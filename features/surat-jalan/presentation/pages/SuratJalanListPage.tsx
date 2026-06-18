'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import {
  openDetailDrawer,
  closeDetailDrawer,
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
  fetchSuratJalanDetail,
  deleteSuratJalan,
  fetchAvailableInvoices,
  attachSuratJalanToInvoice,
} from '@/store/slices/suratJalanSlice'
import useSuratJalanList from '../hooks/useSuratJalanList'
import useSJStatusTransition from '../hooks/useSJStatusTransition'
import SJSummaryCards from '../components/SJSummaryCards'
import SJFilterBar from '../components/SJFilterBar'
import SJTableRow from '../components/SJTableRow'
import AssignModal from '../components/modals/AssignModal'
import ConfirmasiTibaModal from '../components/modals/ConfirmasiTibaModal'
import VoidModal from '../components/modals/VoidModal'
import GeneratePDFModal from '../components/modals/GeneratePDFModal'
import DetailDrawer from '../components/modals/DetailDrawer'
import AttachToInvoiceModal from '../components/modals/AttachToInvoiceModal'
import { StatusLampiran, StatusOperasional } from '../../domain/entities/SuratJalan'
import { AvailableInvoice } from '@/features/invoice/domain/entities/Invoice'
import { useToast } from '@/components/toast/useToast'
import { exportSuratJalan } from '../../infrastructure/repositories/MockSuratJalanRepository'
import { fetchCustomers, fetchProjects } from '@/store/slices/masterSlice'
import TablePagination from '@/features/master/presentation/components/TablePagination'

export default function SuratJalanListPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { list, filters, pagination, isLoading, error, setFilters, resetFilters, setPage, setPerPage } = useSuratJalanList()
  const { assign, deliver, voidSJ } = useSJStatusTransition()
  const {
    isVoidModalOpen, isUploadPODModalOpen, isDetailDrawerOpen, isAssignModalOpen,
    isGeneratePDFModalOpen, isAttachInvoiceModalOpen, availableInvoices, isLoadingInvoices,
    isSubmitting, selectedUuid, selectedSJ,
  } = useSelector((state: RootState) => state.suratJalan)
  const { customers, projects } = useSelector((state: RootState) => state.master)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)
  const isReadOnly = role === 'admin_finance'

  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (error) {
      pushToast({ title: 'Terjadi kesalahan', description: error, variant: 'error' })
    }
  }, [error, pushToast])

  useEffect(() => {
    if (isDetailDrawerOpen && selectedUuid) {
      dispatch(fetchSuratJalanDetail(selectedUuid))
    }
  }, [dispatch, isDetailDrawerOpen, selectedUuid])

  useEffect(() => {
    dispatch(fetchCustomers())
    dispatch(fetchProjects())
  }, [dispatch])

  const stats = useMemo(() => {
    const totalBulanIni = pagination.total
    const sedangBerjalan = list.filter(sj => sj.status === StatusOperasional.ASSIGNED).length
    const belumDitagih = list.filter(sj => sj.status === StatusOperasional.DELIVERED && sj.invoice_attachment_status === StatusLampiran.NO_INVOICE).length
    const draftMenunggu = list.filter(sj => sj.status === StatusOperasional.DRAFT).length
    return { totalBulanIni, sedangBerjalan, belumDitagih, draftMenunggu }
  }, [list, pagination.total])

  const currentSJ = selectedSJ || list.find(sj => sj.uuid === selectedUuid) || null

  const customerOptions = useMemo(() => [
    { value: 'all', label: 'Semua Customer' },
    ...customers
      .map(customer => ({ value: customer.name, label: customer.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ], [customers])

  const projectOptions = useMemo(() => [
    { value: 'all', label: 'Semua Proyek' },
    ...projects
      .map(project => ({ value: project.code, label: `${project.code} - ${project.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ], [projects])

  const toggleSelect = (uuid: string) => {
    setSelectedRows(prev => prev.includes(uuid) ? prev.filter(id => id !== uuid) : [...prev, uuid])
  }

  const handleAction = (action: string, uuid: string) => {
    if (action === 'detail') return dispatch(openDetailDrawer(uuid))
    if (action === 'print') return dispatch(openGeneratePDFModal(uuid))
    if (isReadOnly) return
    if (action === 'edit') return router.push(`/surat-jalan/${uuid}/edit`)
    if (action === 'assign') return dispatch(openAssignModal(uuid))
    if (action === 'deliver') return dispatch(openUploadPODModal(uuid))
    if (action === 'void') return dispatch(openVoidModal(uuid))
    if (action === 'delete') return dispatch(deleteSuratJalan(uuid))
    if (action === 'attach') {
      const sj = list.find(s => s.uuid === uuid)
      if (!sj) return
      dispatch(openAttachInvoiceModal(uuid))
      dispatch(fetchAvailableInvoices({ projectId: sj.project_id, customerId: sj.customer_id, sjUuid: uuid }))
      return
    }
  }

  const handleAttachConfirm = (invoice: AvailableInvoice) => {
    if (!currentSJ) return
    dispatch(attachSuratJalanToInvoice({
      sjUuid: currentSJ.uuid,
      invoiceId: invoice.id,
      invoiceUuid: invoice.uuid,
      invoiceNumber: invoice.invoice_number,
      sjEntry: {
        uuid: currentSJ.uuid,
        sj_number: currentSJ.sj_number,
        sj_date: currentSJ.sj_date,
        origin: currentSJ.origin,
        destination: currentSJ.destination,
        fleet_label: currentSJ.fleet ? `${currentSJ.fleet.name} ${currentSJ.fleet.plate_number}` : '-',
        driver_name: currentSJ.driver?.name || currentSJ.driver_name_manual || '-',
        status: currentSJ.status,
      },
    })).then(result => {
      if (result.meta.requestStatus === 'fulfilled') {
        pushToast({ title: 'Berhasil', description: `SJ ${currentSJ.sj_number} dilampirkan ke Invoice No. ${invoice.invoice_number}`, variant: 'success' })
      }
    })
  }

  const handleExport = async (uuids?: string[]) => {
    try {
      setIsExporting(true)
      const blob = await exportSuratJalan(filters, uuids)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `surat-jalan-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      pushToast({
        title: 'Export berhasil',
        description: uuids?.length ? `${uuids.length} surat jalan diekspor.` : 'Data surat jalan berhasil diekspor.',
        variant: 'success',
      })
    } catch (err) {
      pushToast({
        title: 'Export gagal',
        description: err instanceof Error ? err.message : 'File Excel surat jalan tidak dapat dibuat.',
        variant: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Surat Jalan</div>
          <h1 className="text-2xl font-bold">Surat Jalan</h1>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => router.push('/surat-jalan/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <Plus size={16} />
            Buat SJ Baru
          </button>
        )}
      </div>

      <SJSummaryCards stats={stats} />

      <div className="mt-6">
        <SJFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onExport={() => handleExport()}
          resultCount={pagination.total}
          isExporting={isExporting}
          customerOptions={customerOptions}
          projectOptions={projectOptions}
        />
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm border bg-white" style={{ borderColor: 'var(--border-card)' }}>
        <table className="min-w-full">
          <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">□</th>
              <th className="px-4 py-3 text-left">No. SJ</th>
              <th className="px-4 py-3 text-left">Tgl SJ</th>
              <th className="px-4 py-3 text-left">Proyek & Customer</th>
              <th className="px-4 py-3 text-left">Armada & Supir</th>
              <th className="px-4 py-3 text-left">Status Ops</th>
              <th className="px-4 py-3 text-left">Status Invoice</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading && (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                  <td className="px-4 py-4" colSpan={8}>
                    <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                  </td>
                </tr>
              ))
            )}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                  Tidak ada surat jalan yang cocok dengan filter ini.
                </td>
              </tr>
            )}
            {!isLoading && list.map(sj => (
              <SJTableRow
                key={sj.uuid}
                sj={sj}
                checked={selectedRows.includes(sj.uuid)}
                onToggle={toggleSelect}
                onAction={handleAction}
                role={role ?? undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selectedRows.length > 0 && (
        <div className="mt-4 rounded-xl border bg-white px-4 py-3 flex items-center gap-3" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-sm font-medium">{selectedRows.length} SJ dipilih</div>
          <button
            className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-50"
            style={{ borderColor: 'var(--border-card)' }}
            disabled={isExporting}
            onClick={() => handleExport(selectedRows)}
          >
            {isExporting ? 'Mengekspor...' : 'Export Excel yang Dipilih'}
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded-lg text-gray-500"
            onClick={() => setSelectedRows([])}
          >
            Batalkan Pilihan
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between mt-6 text-sm">
        <TablePagination
          page={pagination.page}
          perPage={pagination.perPage}
          total={pagination.total}
          label="surat jalan"
          onPageChange={setPage}
          showBorderTop={false}
          className="flex-1 px-0 py-0"
        />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Tampilkan:</span>
          <select
            className="form-input text-sm"
            value={pagination.perPage}
            onChange={e => setPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
          </select>
          <span className="text-gray-500">per halaman</span>
        </div>
      </div>

      <AssignModal
        open={isAssignModalOpen}
        sj={currentSJ}
        onClose={() => dispatch(closeAssignModal())}
        onConfirm={input => {
          if (!currentSJ) return
          assign(currentSJ.uuid, input)
        }}
      />

      <ConfirmasiTibaModal
        open={isUploadPODModalOpen}
        sj={currentSJ}
        onClose={() => dispatch(closeUploadPODModal())}
        onConfirm={input => {
          if (!currentSJ) return
          deliver(currentSJ.uuid, input)
        }}
      />

      <VoidModal
        open={isVoidModalOpen}
        sj={currentSJ}
        onClose={() => dispatch(closeVoidModal())}
        onConfirm={(reason, confirmation) => {
          if (!currentSJ) return
          if (confirmation !== 'VOID') return
          voidSJ(currentSJ.uuid, reason)
        }}
      />

      <GeneratePDFModal
        open={isGeneratePDFModalOpen}
        sj={currentSJ}
        onClose={() => dispatch(closeGeneratePDFModal())}
      />

      <DetailDrawer
        open={isDetailDrawerOpen}
        sj={currentSJ}
        onClose={() => dispatch(closeDetailDrawer())}
        onViewDetail={(uuid) => router.push(`/surat-jalan/${uuid}`)}
        onPrint={(uuid) => dispatch(openGeneratePDFModal(uuid))}
      />

      <AttachToInvoiceModal
        open={isAttachInvoiceModalOpen}
        sj={currentSJ}
        availableInvoices={availableInvoices}
        isLoadingInvoices={isLoadingInvoices}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeAttachInvoiceModal())}
        onConfirm={handleAttachConfirm}
      />
    </DashboardLayout>
  )
}
