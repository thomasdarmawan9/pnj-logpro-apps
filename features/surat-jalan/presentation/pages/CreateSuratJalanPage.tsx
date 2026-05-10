'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
import { AppDispatch, RootState } from '@/store'
import { createSuratJalan } from '@/store/slices/suratJalanSlice'
import { fetchDrivers, fetchFleets, fetchProjects } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import SJFormProyekSection from '../components/SJFormProyekSection'
import SJFormArmadaSection from '../components/SJFormArmadaSection'
import SJFormSupirSection from '../components/SJFormSupirSection'
import SJFormItemsSection from '../components/SJFormItemsSection'
import useSuratJalanForm from '../hooks/useSuratJalanForm'
import { formatLongDate } from '../utils/format'
import type { ArmadaOption, DriverOption, ProjectOption } from '../utils/mockOptions'
import type { SJItem } from '../../domain/entities/SuratJalan'

export default function CreateSuratJalanPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { projects, fleets, drivers, isLoading: isMasterLoading } = useSelector((state: RootState) => state.master)

  const { form, updateField, errors, validate, isDirty } = useSuratJalanForm({ mode: 'create' })
  const [driverMode, setDriverMode] = useState<'master' | 'tbd'>('master')
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null)
  const [selectedArmada, setSelectedArmada] = useState<ArmadaOption | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<DriverOption | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!projects.length) dispatch(fetchProjects())
    if (!fleets.length) dispatch(fetchFleets())
    if (!drivers.length) dispatch(fetchDrivers())
  }, [dispatch, projects.length, fleets.length, drivers.length])

  const projectOptionsFromApi = useMemo<ProjectOption[]>(() => {
    return projects
      .filter(project => project.status === 'active')
      .map(project => ({
        id: project.id,
        name: project.name,
        code: project.code,
        customer: project.customer.name,
        contractNumber: project.contract_number,
      }))
  }, [projects])

  const armadaOptionsFromApi = useMemo<ArmadaOption[]>(() => {
    return fleets
      .filter(fleet => fleet.status === 'active')
      .map(fleet => ({
        id: fleet.id,
        name: fleet.name,
        plate: fleet.plate_number,
        isTBD: fleet.is_tbd,
        status: fleet.status === 'active' ? 'active' : 'inactive',
      }))
  }, [fleets])

  const driverOptionsFromApi = useMemo<DriverOption[]>(() => {
    return drivers
      .filter(driver => driver.status === 'active')
      .map(driver => ({
        id: driver.id,
        name: driver.name,
        simExpiredAt: driver.sim_expired_at,
        status: driver.status,
      }))
  }, [drivers])

  const canPublish = !!selectedArmada && (
    driverMode === 'tbd' ||
    (driverMode === 'master' && !!selectedDriver)
  )

  const summary = useMemo(() => ({
    noSJ: 'SJ-2026-090',
    proyek: selectedProject?.name || '-',
    customer: selectedProject?.customer || '-',
    armada: selectedArmada?.name || '-',
    supir: driverMode === 'tbd' ? 'Belum ditentukan' : (selectedDriver?.name || '-'),
    rute: `${form.origin || '-'} → ${form.destination || '-'}`,
    tanggal: formatLongDate(form.sj_date),
    jumlahItem: form.items.length,
    totalNilai: form.items.reduce((s, i) => s + i.qty * i.unit_price, 0),
  }), [form, selectedArmada, selectedDriver, selectedProject, driverMode])

  const handleSubmit = async (publish: boolean) => {
    const valid = validate(publish)
    if (!valid || isSubmitting) return

    setIsSubmitting(true)
    const result = await dispatch(createSuratJalan({
      ...form,
      project_id: selectedProject?.id || 0,
      fleet_id: selectedArmada?.id || 0,
      driver_id: driverMode === 'master' ? selectedDriver?.id || null : null,
      driver_name_manual: driverMode === 'tbd' ? 'Belum Ditentukan' : null,
      publish,
    }))
    setIsSubmitting(false)

    if (createSuratJalan.fulfilled.match(result)) {
      pushToast({ title: 'Surat jalan dibuat', description: publish ? 'SJ berhasil diterbitkan' : 'SJ disimpan sebagai draft', variant: 'success' })
      router.push('/surat-jalan')
      return
    }

    pushToast({
      title: 'Gagal membuat surat jalan',
      description: (result.payload as string) || 'Data tidak tersimpan. Periksa pilihan proyek, armada, dan supir.',
      variant: 'error',
    })
  }

  const handleCancel = () => {
    if (isDirty) {
      const ok = window.confirm('Perubahan belum disimpan. Yakin ingin keluar?')
      if (!ok) return
    }
    router.push('/surat-jalan')
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <div className="text-xs text-gray-500">Dashboard / Surat Jalan / Buat SJ Baru</div>
            <h1 className="text-2xl font-bold">Buat Surat Jalan</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SJFormProyekSection
            value={selectedProject}
            options={projectOptionsFromApi}
            onSelect={(project) => {
              setSelectedProject(project)
              updateField('project_id', project.id)
            }}
            errors={errors}
          />

          <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Tanggal SJ</div>
            <label className="text-xs font-medium" style={{ color: '#374151' }}>
              Tanggal SJ *
              <input
                type="date"
                className={`form-input w-full mt-1 ${errors?.sj_date ? 'error' : ''}`}
                value={form.sj_date}
                onChange={e => updateField('sj_date', e.target.value)}
              />
              {errors?.sj_date && <div className="text-xs text-red-600 mt-1">{errors.sj_date}</div>}
            </label>

            <label className="text-xs font-medium mt-4 block" style={{ color: '#374151' }}>
              No. Surat Jalan (otomatis)
              <input className="form-input w-full mt-1 disabled italic" value="SJ-2026-090" disabled readOnly />
              <div className="text-[11px] text-gray-400 mt-1">Nomor otomatis dibuat oleh sistem</div>
            </label>
          </div>

          <SJFormArmadaSection
            value={selectedArmada}
            options={armadaOptionsFromApi}
            onChange={(armada) => {
              setSelectedArmada(armada)
              updateField('fleet_id', armada.id)
            }}
            showTBDWarning
            errors={errors}
          />

          <SJFormSupirSection
            mode={driverMode}
            driver={selectedDriver}
            options={driverOptionsFromApi}
            onModeChange={(mode) => {
              setDriverMode(mode)
              if (mode === 'master') {
                updateField('driver_name_manual', '')
              } else {
                setSelectedDriver(null)
                updateField('driver_id', null)
                updateField('driver_name_manual', 'Belum Ditentukan')
              }
            }}
            onDriverChange={(driver) => {
              setSelectedDriver(driver)
              updateField('driver_id', driver?.id || null)
              if (driver) {
                updateField('driver_name_manual', '')
              }
            }}
            errors={errors}
          />

          <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Rute & Muatan</div>
            <label className="text-xs font-medium" style={{ color: '#374151' }}>
              Lokasi Asal *
              <input
                className={`form-input w-full mt-1 ${errors?.origin ? 'error' : ''}`}
                value={form.origin}
                onChange={e => updateField('origin', e.target.value)}
                placeholder="contoh: Gudang PNJ, Jl. Arteri Supadio Pontianak"
              />
              {errors?.origin && <div className="text-xs text-red-600 mt-1">{errors.origin}</div>}
            </label>

            <div className="flex items-end gap-3 mt-4">
              <label className="text-xs font-medium flex-1" style={{ color: '#374151' }}>
                Lokasi Tujuan *
                <input
                  className={`form-input w-full mt-1 ${errors?.destination ? 'error' : ''}`}
                  value={form.destination}
                  onChange={e => updateField('destination', e.target.value)}
                  placeholder="contoh: Lokasi PT. ATP BIO, Kubu Raya"
                />
                {errors?.destination && <div className="text-xs text-red-600 mt-1">{errors.destination}</div>}
              </label>
              <button
                type="button"
                onClick={() => {
                  const prevOrigin = form.origin
                  updateField('origin', form.destination)
                  updateField('destination', prevOrigin)
                }}
                className="px-3 py-2 rounded-lg border"
                style={{ borderColor: 'var(--border-card)' }}
                title="Tukar asal-tujuan"
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>

            <label className="text-xs font-medium mt-4 block" style={{ color: '#374151' }}>
              Deskripsi Muatan
              <textarea
                className="form-input w-full mt-1"
                rows={3}
                value={form.cargo_description || ''}
                onChange={e => updateField('cargo_description', e.target.value)}
                placeholder="contoh: Kendaraan operasional untuk periode sewa"
              />
            </label>
          </div>

          <SJFormItemsSection
            items={form.items}
            onChange={(items: SJItem[]) => updateField('items', items)}
          />

          <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Catatan Internal</div>
            <label className="text-xs font-medium" style={{ color: '#374151' }}>
              Catatan Internal (tidak tampil di PDF)
              <textarea
                className="form-input w-full mt-1"
                rows={2}
                value={form.internal_notes || ''}
                onChange={e => updateField('internal_notes', e.target.value)}
                placeholder="Catatan khusus untuk tim internal..."
              />
            </label>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button onClick={handleCancel} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
              Batal
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isMasterLoading}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border-card)' }}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan sebagai Draft'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: canPublish ? 'var(--green-primary)' : '#A7D7B2' }}
              disabled={!canPublish || isSubmitting || isMasterLoading}
              title={!canPublish ? 'Pilih armada terlebih dahulu' : undefined}
            >
              {isSubmitting ? 'Menyimpan...' : 'Buat & Terbitkan →'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-white p-5 border sticky top-24" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-3">Ringkasan SJ</div>
            <div className="text-xs text-gray-500">No. SJ</div>
            <div className="text-sm font-mono">{summary.noSJ}</div>
            <div className="text-xs text-gray-500 mt-2">Proyek</div>
            <div className="text-sm">{summary.proyek}</div>
            <div className="text-xs text-gray-500 mt-2">Customer</div>
            <div className="text-sm">{summary.customer}</div>
            <div className="text-xs text-gray-500 mt-2">Armada</div>
            <div className="text-sm">{summary.armada}</div>
            <div className="text-xs text-gray-500 mt-2">Supir</div>
            <div className="text-sm">{summary.supir}</div>
            <div className="text-xs text-gray-500 mt-2">Rute</div>
            <div className="text-sm">{summary.rute}</div>
            <div className="text-xs text-gray-500 mt-2">Tanggal</div>
            <div className="text-sm">{summary.tanggal}</div>
            <div className="text-xs text-gray-500 mt-2">Rincian Item</div>
            <div className="text-sm">{summary.jumlahItem > 0 ? `${summary.jumlahItem} item` : '-'}</div>
            {summary.totalNilai > 0 && (
              <>
                <div className="text-xs text-gray-500 mt-2">Total Nilai</div>
                <div className="text-sm font-semibold" style={{ color: '#166534' }}>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summary.totalNilai)}
                </div>
              </>
            )}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-semibold">DRAFT</div>
          </div>

          {selectedProject && (
            <div className="rounded-xl bg-white p-5 border" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-sm font-semibold mb-3">Info Proyek</div>
              <div className="text-xs text-gray-500">Total SJ aktif</div>
              <div className="text-sm">12</div>
              <div className="text-xs text-gray-500 mt-2">Total invoice</div>
              <div className="text-sm">5</div>
              <div className="text-xs text-gray-500 mt-2">Contract number</div>
              <div className="text-sm">{selectedProject.contractNumber}</div>
              <button className="text-sm text-green-700 mt-3">Lihat Detail Proyek →</button>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  )
}
