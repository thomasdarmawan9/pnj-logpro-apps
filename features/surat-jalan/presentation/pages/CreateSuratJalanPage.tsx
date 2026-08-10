'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, ArrowRightLeft, Check, ChevronDown, Search } from 'lucide-react'
import { AppDispatch, RootState } from '@/store'
import { createSuratJalan } from '@/store/slices/suratJalanSlice'
import { fetchCustomers, fetchDrivers, fetchFleets, fetchProjects } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import SJFormProyekSection from '../components/SJFormProyekSection'
import SJFormArmadaSection from '../components/SJFormArmadaSection'
import SJFormSupirSection from '../components/SJFormSupirSection'
import SJFormItemsSection from '../components/SJFormItemsSection'
import SJPartyNameCombobox from '../components/SJPartyNameCombobox'
import useSuratJalanForm from '../hooks/useSuratJalanForm'
import { formatLongDate } from '../utils/format'
import type { ArmadaOption, DriverOption, ProjectOption } from '../utils/mockOptions'
import type { SJItem } from '../../domain/entities/SuratJalan'
import { stockRepository } from '@/features/stock/infrastructure/repositories/MockStockRepository'
import type { CustomerStockAvailableItem } from '@/features/stock/application/use-cases/GetCustomerStockDetail'
import type { Customer } from '@/features/master/domain/entities/Customer'

export default function CreateSuratJalanPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { projects, customers, fleets, drivers, isLoading: isMasterLoading } = useSelector((state: RootState) => state.master)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)

  const { form, updateField, errors, validate, isDirty } = useSuratJalanForm({ mode: 'create' })
  const [scopeMode, setScopeMode] = useState<'project' | 'customer'>('project')
  const [armadaMode, setArmadaMode] = useState<'master' | 'tbd'>('master')
  const [driverMode, setDriverMode] = useState<'master' | 'tbd'>('master')
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedArmada, setSelectedArmada] = useState<ArmadaOption | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<DriverOption | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableStockItems, setAvailableStockItems] = useState<CustomerStockAvailableItem[]>([])
  const [isLoadingStockItems, setIsLoadingStockItems] = useState(false)
  const customerPickerRef = useRef<HTMLDivElement>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)

  useEffect(() => {
    if (!projects.length) dispatch(fetchProjects())
    if (!customers.length) dispatch(fetchCustomers())
    if (!fleets.length) dispatch(fetchFleets())
    if (!drivers.length) dispatch(fetchDrivers())
  }, [dispatch, projects.length, customers.length, fleets.length, drivers.length, role, router, pushToast])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!customerPickerRef.current?.contains(event.target as Node)) {
        setCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const projectOptionsFromApi = useMemo<ProjectOption[]>(() => {
    return projects
      .filter(project => project.status === 'active')
      .map(project => ({
        id: project.id,
        name: project.name,
        code: project.code,
        customer: project.customer.name,
        customerId: project.customer.id,
        customerUuid: project.customer.uuid,
        contractNumber: project.contract_number,
      }))
  }, [projects])

  useEffect(() => {
    let cancelled = false

    const customerUuid = scopeMode === 'project' ? selectedProject?.customerUuid : selectedCustomer?.uuid

    if (!customerUuid) {
      setAvailableStockItems([])
      setIsLoadingStockItems(false)
      return
    }

    setIsLoadingStockItems(true)
    stockRepository.getCustomerAvailableItems(customerUuid)
      .then(rows => {
        if (!cancelled) setAvailableStockItems(rows)
      })
      .catch(() => {
        if (!cancelled) setAvailableStockItems([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStockItems(false)
      })

    return () => { cancelled = true }
  }, [scopeMode, selectedProject?.customerUuid, selectedCustomer?.uuid])

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

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    const list = q
      ? customers.filter(customer =>
          customer.name.toLowerCase().includes(q) ||
          (customer.npwp || '').toLowerCase().includes(q) ||
          (customer.address || '').toLowerCase().includes(q)
        )
      : customers
    return list.slice(0, 25)
  }, [customers, customerSearch])

  const canPublish = true

  const summary = useMemo(() => ({
    noSJ: 'SJ-2026-090',
    proyek: scopeMode === 'project' ? selectedProject?.name || '-' : 'Tanpa proyek',
    customer: scopeMode === 'project' ? selectedProject?.customer || '-' : selectedCustomer?.name || '-',
    armada: armadaMode === 'tbd' ? 'Belum ditentukan' : (selectedArmada?.name || '-'),
    supir: driverMode === 'tbd' ? 'Belum ditentukan' : (selectedDriver?.name || '-'),
    rute: `${form.origin || '-'} → ${form.destination || '-'}`,
    tanggal: formatLongDate(form.sj_date),
    jumlahItem: form.items.length,
  }), [form, selectedArmada, selectedDriver, selectedProject, selectedCustomer, armadaMode, driverMode, scopeMode])

  const handleSubmit = async (publish: boolean) => {
    const valid = validate(publish)
    if (!valid || isSubmitting) return

    setIsSubmitting(true)
    const result = await dispatch(createSuratJalan({
      ...form,
      project_id: scopeMode === 'project' ? selectedProject?.id || null : null,
      customer_id: scopeMode === 'customer' ? selectedCustomer?.id || null : null,
      fleet_id: selectedArmada?.id ?? null,
      driver_id: driverMode === 'master' ? selectedDriver?.id || null : null,
      driver_name_manual: null,
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

  const clearStockItems = () => {
    updateField('items', form.items.map(item => item.source_type === 'stock'
      ? {
          ...item,
          source_type: 'manual',
          stock_item_id: null,
          stock_item_uuid: null,
          stock_item_code: null,
          stock_item_name: null,
          stock_kategori_name: null,
        }
      : item
    ))
  }

  const selectCustomer = (customer: Customer | null) => {
    const customerChanged = selectedCustomer?.uuid !== customer?.uuid
    setSelectedCustomer(customer)
    setCustomerSearch(customer?.name ?? '')
    setCustomerDropdownOpen(false)
    setSelectedProject(null)
    updateField('project_id', null)
    updateField('customer_id', customer?.id ?? null)
    if (customerChanged) clearStockItems()
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Informasi Dasar</div>
              <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                {(['project', 'customer'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (scopeMode === mode) return
                      setScopeMode(mode)
                      setSelectedProject(null)
                      setSelectedCustomer(null)
                      setCustomerSearch('')
                      setCustomerDropdownOpen(false)
                      updateField('project_id', null)
                      updateField('customer_id', null)
                      clearStockItems()
                    }}
                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: scopeMode === mode ? 'var(--green-primary)' : 'white',
                      color: scopeMode === mode ? 'white' : '#374151',
                    }}
                  >
                    {mode === 'project' ? 'Proyek' : 'Customer'}
                  </button>
                ))}
              </div>
            </div>

            {scopeMode === 'project' ? (
              <SJFormProyekSection
                value={selectedProject}
                options={projectOptionsFromApi}
                onSelect={(project) => {
                  const customerChanged = selectedProject?.customerUuid !== project.customerUuid
                  setSelectedProject(project)
                  setSelectedCustomer(null)
                  updateField('project_id', project.id)
                  updateField('customer_id', null)
                  if (customerChanged) clearStockItems()
                }}
                errors={errors}
              />
            ) : (
              <label className="text-xs font-medium block" style={{ color: '#374151' }}>
                Customer *
                <div ref={customerPickerRef} className="relative mt-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Search size={15} />
                    </span>
                    <input
                      className={`form-input w-full ${errors?.project_id ? 'error' : ''}`}
                      style={{ paddingLeft: 42, paddingRight: 40 }}
                      value={customerSearch}
                      placeholder="Ketik nama customer..."
                      onFocus={() => setCustomerDropdownOpen(true)}
                      onChange={event => {
                        setCustomerSearch(event.target.value)
                        setSelectedCustomer(null)
                        updateField('customer_id', null)
                        setCustomerDropdownOpen(true)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomerDropdownOpen(open => !open)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                      aria-label="Buka daftar customer"
                    >
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
                  </div>
                  {customerDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
                          const selected = selectedCustomer?.id === customer.id
                          return (
                            <button
                              key={customer.uuid}
                              type="button"
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                            >
                              <span className="mt-0.5 w-4 text-green-600">{selected && <Check size={14} />}</span>
                              <span className="min-w-0">
                                <span className="block font-medium text-gray-800 truncate">{customer.name}</span>
                                <span className="block text-xs text-gray-500 truncate">{customer.npwp ? `NPWP: ${customer.npwp}` : customer.address || 'Non-NPWP'}</span>
                              </span>
                            </button>
                          )
                        }) : (
                          <div className="px-3 py-3 text-sm text-gray-500">Customer tidak ditemukan</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors?.project_id && <div className="text-xs text-red-600 mt-1">{errors.project_id}</div>}
              </label>
            )}

            <div className="mt-4 space-y-4">
              <SJPartyNameCombobox
                label="Nama Pengirim"
                value={form.sender_name}
                customers={customers}
                onChange={value => updateField('sender_name', value)}
                placeholder="Cari customer atau ketik nama pengirim..."
              />
              <SJPartyNameCombobox
                label="Nama Penerima"
                value={form.recipient_name}
                customers={customers}
                onChange={value => updateField('recipient_name', value)}
                placeholder="Cari customer atau ketik nama penerima..."
              />
            </div>
          </div>

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
            mode={armadaMode}
            value={selectedArmada}
            options={armadaOptionsFromApi}
            onModeChange={mode => {
              setArmadaMode(mode)
              if (mode === 'tbd') { setSelectedArmada(null); updateField('fleet_id', null) }
            }}
            onChange={armada => {
              setSelectedArmada(armada)
              updateField('fleet_id', armada?.id ?? null)
            }}
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
            availableStockItems={availableStockItems}
            selectedCustomerName={scopeMode === 'project' ? selectedProject?.customer : selectedCustomer?.name}
            isLoadingStockItems={isLoadingStockItems}
            error={errors.items}
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
              title={!canPublish ? 'Lengkapi armada dan supir terlebih dahulu' : undefined}
            >
              {isSubmitting ? 'Menyimpan...' : 'Buat & Terbitkan →'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
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
