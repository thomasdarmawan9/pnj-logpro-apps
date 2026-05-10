'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
import { AppDispatch, RootState } from '@/store'
import { updateSuratJalan } from '@/store/slices/suratJalanSlice'
import { fetchDrivers, fetchFleets } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import useSuratJalanDetail from '../hooks/useSuratJalanDetail'
import useSuratJalanForm from '../hooks/useSuratJalanForm'
import SJFormArmadaSection from '../components/SJFormArmadaSection'
import SJFormSupirSection from '../components/SJFormSupirSection'
import SJFormItemsSection from '../components/SJFormItemsSection'
import SJLampiranUploadZone from '../components/SJLampiranUploadZone'
import type { ArmadaOption, DriverOption } from '../utils/mockOptions'
import { StatusOperasional, SJItem } from '../../domain/entities/SuratJalan'

interface EditSuratJalanPageProps {
  uuid: string
}

export default function EditSuratJalanPage({ uuid }: EditSuratJalanPageProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { fleets, drivers } = useSelector((state: RootState) => state.master)
  const { selectedSJ, isDetailLoading } = useSuratJalanDetail(uuid)
  const { form, setForm, updateField, errors, validate } = useSuratJalanForm({ mode: 'edit' })

  const [driverMode, setDriverMode] = useState<'master' | 'tbd'>('master')
  const [selectedArmada, setSelectedArmada] = useState<ArmadaOption | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<DriverOption | null>(null)
  const [lampiranPaths, setLampiranPaths] = useState<string[]>([])

  useEffect(() => {
    if (!fleets.length) dispatch(fetchFleets())
    if (!drivers.length) dispatch(fetchDrivers())
  }, [dispatch, fleets.length, drivers.length])

  const armadaOptions = useMemo(() => fleets
    .filter(fleet => fleet.status === 'active' || fleet.id === selectedSJ?.fleet_id)
    .map(fleet => ({
      id: fleet.id,
      name: fleet.name,
      plate: fleet.plate_number,
      isTBD: fleet.is_tbd,
      status: fleet.status === 'active' ? 'active' : 'inactive',
    } satisfies ArmadaOption)), [fleets, selectedSJ?.fleet_id])

  const driverOptions = useMemo(() => drivers
    .filter(driver => driver.status === 'active' || driver.id === selectedSJ?.driver_id)
    .map(driver => ({
      id: driver.id,
      name: driver.name,
      simExpiredAt: driver.sim_expired_at,
      status: driver.status,
    } satisfies DriverOption)), [drivers, selectedSJ?.driver_id])

  useEffect(() => {
    if (selectedSJ) {
      if (selectedSJ.status === StatusOperasional.DELIVERED || selectedSJ.status === StatusOperasional.VOID) {
        router.push(`/surat-jalan/${selectedSJ.uuid}`)
        return
      }
      setForm({
        project_id: selectedSJ.project_id,
        fleet_id: selectedSJ.fleet_id,
        driver_id: selectedSJ.driver_id,
        driver_name_manual: selectedSJ.driver_name_manual || '',
        sj_date: selectedSJ.sj_date,
        origin: selectedSJ.origin,
        destination: selectedSJ.destination,
        cargo_description: selectedSJ.cargo_description || '',
        items: selectedSJ.items ?? [],
        operational_cost: selectedSJ.operational_cost,
        internal_notes: selectedSJ.internal_notes || '',
        publish: false,
      })
      setSelectedArmada(armadaOptions.find(a => a.id === selectedSJ.fleet_id) || null)
      setSelectedDriver(driverOptions.find(d => d.id === selectedSJ.driver_id) || null)
      setLampiranPaths(selectedSJ.lampiran_paths ?? [])
      if (selectedSJ.driver_id) setDriverMode('master')
      else setDriverMode('tbd')
    }
  }, [selectedSJ, router, setForm, armadaOptions, driverOptions])

  const handleSubmit = () => {
    const valid = validate()
    if (!valid || !selectedSJ) return

    dispatch(updateSuratJalan({
      uuid: selectedSJ.uuid,
      dto: {
        fleet_id: selectedArmada?.id,
        driver_id: driverMode === 'master' ? selectedDriver?.id || null : null,
        driver_name_manual: driverMode === 'tbd' ? 'Belum Ditentukan' : null,
        origin: form.origin,
        destination: form.destination,
        cargo_description: form.cargo_description || null,
        items: form.items.length > 0 ? form.items : null,
        internal_notes: form.internal_notes || null,
        lampiran_paths: lampiranPaths.length > 0 ? lampiranPaths : null,
      },
    }))
    pushToast({ title: 'Perubahan disimpan', description: 'Surat jalan berhasil diperbarui', variant: 'success' })
    router.push('/surat-jalan')
  }

  if (isDetailLoading || !selectedSJ) {
    return (
      <DashboardLayout>
        <div className="text-sm text-gray-500">Memuat data...</div>
      </DashboardLayout>
    )
  }

  const isAssigned = selectedSJ.status === StatusOperasional.ASSIGNED

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
          <ArrowLeft size={14} />
        </button>
        <div>
          <div className="text-xs text-gray-500">Dashboard / Surat Jalan / Edit</div>
          <h1 className="text-2xl font-bold">Edit Surat Jalan</h1>
        </div>
      </div>

      {selectedSJ.status === StatusOperasional.DRAFT && (
        <div className="rounded-xl border px-4 py-3 text-sm mb-4" style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
          SJ ini masih Draft. Lengkapi armada dan supir untuk menerbitkan.
        </div>
      )}
      {selectedSJ.status === StatusOperasional.ASSIGNED && (
        <div className="rounded-xl border px-4 py-3 text-sm mb-4" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB', color: '#92400E' }}>
          SJ sudah Assigned. Hanya beberapa field yang bisa diedit.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Informasi Dasar</div>
            <label className="text-xs font-medium" style={{ color: '#374151' }}>
              Proyek
              <input className="form-input w-full mt-1 disabled" value={selectedSJ.project.name} disabled readOnly />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <label className="text-xs font-medium" style={{ color: '#374151' }}>
                Customer
                <input className="form-input w-full mt-1 disabled" value={selectedSJ.customer.name} disabled readOnly />
              </label>
              <label className="text-xs font-medium" style={{ color: '#374151' }}>
                No. Kontrak
                <input className="form-input w-full mt-1 disabled" value={selectedSJ.project.contract_number} disabled readOnly />
              </label>
            </div>
            <label className="text-xs font-medium mt-4 block" style={{ color: '#374151' }}>
              Tanggal SJ
              <input type="date" className="form-input w-full mt-1 disabled" value={selectedSJ.sj_date} disabled readOnly />
            </label>
          </div>

          <SJFormArmadaSection
            value={selectedArmada}
            options={armadaOptions}
            onChange={(armada) => {
              if (isAssigned) {
                setSelectedArmada(armada)
                updateField('fleet_id', armada.id)
              } else {
                setSelectedArmada(armada)
                updateField('fleet_id', armada.id)
              }
            }}
            showTBDWarning
            errors={errors}
          />

          <SJFormSupirSection
            mode={driverMode}
            driver={selectedDriver}
            options={driverOptions}
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

          <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Rute & Muatan</div>
            <label className="text-xs font-medium" style={{ color: '#374151' }}>
              Lokasi Asal *
              <input
                className={`form-input w-full mt-1 ${errors?.origin ? 'error' : ''}`}
                value={form.origin}
                onChange={e => updateField('origin', e.target.value)}
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
              />
            </label>
          </div>

          <SJFormItemsSection
            items={form.items}
            onChange={(items: SJItem[]) => updateField('items', items)}
          />

          <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Catatan Internal</div>
            <label className="text-xs font-medium block" style={{ color: '#374151' }}>
              Catatan Internal
              <textarea
                className="form-input w-full mt-1"
                rows={2}
                value={form.internal_notes || ''}
                onChange={e => updateField('internal_notes', e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-1">Lampiran Dokumen</div>
            <div className="text-xs text-gray-500 mb-4">Upload foto atau file PDF sebagai dokumen pendukung SJ ini.</div>
            <SJLampiranUploadZone
              value={lampiranPaths}
              onChange={setLampiranPaths}
              sjUuid={selectedSJ.uuid}
            />
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button onClick={() => router.back()} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
              Batal
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              Simpan Perubahan
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl bg-white p-5 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-2">Ringkasan</div>
            <div className="text-xs text-gray-500">No. SJ</div>
            <div className="text-sm font-mono">{selectedSJ.sj_number}</div>
            <div className="text-xs text-gray-500 mt-2">Status</div>
            <div className="text-sm">{selectedSJ.status}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
