'use client'

import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
import { AppDispatch } from '@/store'
import { createSuratJalan } from '@/store/slices/suratJalanSlice'
import { useToast } from '@/components/toast/useToast'
import SJFormProyekSection from '../components/SJFormProyekSection'
import SJFormArmadaSection from '../components/SJFormArmadaSection'
import SJFormSupirSection from '../components/SJFormSupirSection'
import useSuratJalanForm from '../hooks/useSuratJalanForm'
import { formatLongDate, formatRupiah } from '../utils/format'
import { armadaOptions, driverOptions, projectOptions } from '../utils/mockOptions'

export default function CreateSuratJalanPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()

  const { form, updateField, errors, validate, isDirty } = useSuratJalanForm({ mode: 'create' })
  const [driverMode, setDriverMode] = useState<'master' | 'manual'>('master')
  const [selectedProject, setSelectedProject] = useState(projectOptions.find(p => p.id === form.project_id) || null)
  const [selectedArmada, setSelectedArmada] = useState(armadaOptions.find(a => a.id === form.fleet_id) || null)
  const [selectedDriver, setSelectedDriver] = useState(driverOptions.find(d => d.id === form.driver_id) || null)

  const canPublish = selectedArmada && !selectedArmada.isTBD && ((driverMode === 'master' && selectedDriver) || (driverMode === 'manual' && form.driver_name_manual?.trim()))

  const summary = useMemo(() => ({
    noSJ: 'SJ-2026-090',
    proyek: selectedProject?.name || '-',
    customer: selectedProject?.customer || '-',
    armada: selectedArmada?.name || '-',
    supir: selectedDriver?.name || form.driver_name_manual || '-',
    rute: `${form.origin || '-'} → ${form.destination || '-'}`,
    tanggal: formatLongDate(form.sj_date),
  }), [form, selectedArmada, selectedDriver, selectedProject])

  const handleSubmit = (publish: boolean) => {
    const valid = validate(publish)
    if (!valid) return
    dispatch(createSuratJalan({
      ...form,
      project_id: selectedProject?.id || 0,
      fleet_id: selectedArmada?.id || 0,
      driver_id: driverMode === 'master' ? selectedDriver?.id || null : null,
      driver_name_manual: driverMode === 'manual' ? form.driver_name_manual || '' : null,
      publish,
    }))
    pushToast({ title: 'Surat jalan dibuat', description: publish ? 'SJ berhasil diterbitkan' : 'SJ disimpan sebagai draft', variant: 'success' })
    router.push('/surat-jalan')
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
            manualName={form.driver_name_manual || ''}
            onModeChange={setDriverMode}
            onDriverChange={(driver) => {
              setSelectedDriver(driver)
              updateField('driver_id', driver?.id || null)
            }}
            onManualNameChange={value => updateField('driver_name_manual', value)}
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

          <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-4">Biaya Operasional</div>
            <label className="text-xs font-medium" style={{ color: '#374151' }}>
              Biaya Operasional (Uang Jalan + Estimasi BBM)
              <input
                className="form-input w-full mt-1"
                value={form.operational_cost}
                onChange={e => updateField('operational_cost', Number(e.target.value))}
                placeholder="Rp 0"
              />
              <div className="text-[11px] text-gray-400 mt-1">Digunakan untuk kalkulasi Profit & Loss per proyek</div>
            </label>

            <label className="text-xs font-medium mt-4 block" style={{ color: '#374151' }}>
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
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border-card)' }}
            >
              Simpan sebagai Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: canPublish ? 'var(--green-primary)' : '#A7D7B2' }}
              disabled={!canPublish}
              title={!canPublish ? 'Pilih armada dan supir terlebih dahulu' : undefined}
            >
              Buat & Terbitkan →
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

          <div className="rounded-xl bg-white p-5 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-sm font-semibold mb-3">Estimasi Biaya</div>
            <div className="text-xs text-gray-500">Biaya Operasional</div>
            <div className="text-sm font-mono">{formatRupiah(form.operational_cost || 0)}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
