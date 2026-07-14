'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, ArrowLeft, Info, Truck, KeyRound, Search, ChevronDown, Check, Wrench, ArrowRightLeft, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { createInvoice } from '@/store/slices/invoiceSlice'
import { fetchCustomers, fetchDrivers, fetchFleets } from '@/store/slices/masterSlice'
import { fetchBankAccounts } from '@/store/slices/settingsSlice'
import { useToast } from '@/components/toast/useToast'
import { validateCreateInvoice } from '../../application/validators/InvoiceValidator'
import useInvoiceForm from '../hooks/useInvoiceForm'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import InvoiceItemRow from '../components/InvoiceItemRow'
import DeliveryInvoiceItemsSection from '../components/DeliveryInvoiceItemsSection'
import DeliveryOperationsSection from '../components/DeliveryOperationsSection'
import DeliveryPricingSection, { type AdditionalDeliveryCharge } from '../components/DeliveryPricingSection'
import InvoiceTaxCalculator from '../components/InvoiceTaxCalculator'
import DownPaymentForm from '../components/DownPaymentForm'
import type { CreateDownPaymentDto } from '../../application/dto/CreateInvoiceDto'
import type { DeliveryPricingMode, InvoiceServiceType } from '../../domain/entities/Invoice'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'
import type { Customer } from '@/features/master/domain/entities/Customer'
import { apiRequest } from '@/lib/apiClient'
import ConfirmOverwriteSJModal from '../components/modals/ConfirmOverwriteSJModal'
import ClearManualSJPrompt from '../components/modals/ClearManualSJPrompt'
import { suratJalanRepository } from '../../../surat-jalan/infrastructure/repositories/MockSuratJalanRepository'
import type { SjLookupResult } from '../../../surat-jalan/infrastructure/repositories/ISuratJalanRepository'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

type CreateSJOption = {
  id: number
  uuid: string
  sj_number: string
  sj_date: string
  project_id: number | null
  customer_id: number
  origin: string
  destination: string
  cargo_description: string | null
  status: string
  invoice_id: number | null
  fleet_id: number | null
  fleet: { id: number; name: string; plate_number: string; is_tbd?: boolean } | null
  driver_id: number | null
  driver_name_manual: string | null
  items: Array<{
    description?: string | null
    qty?: number | string | null
    unit?: string | null
    weight?: number | string | null
    volume?: number | string | null
    notes?: string | null
  }> | null
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'check'>('transfer')
  const [bankAccountId, setBankAccountId] = useState<number | null>(null)
  const [downPayment, setDownPayment] = useState<CreateDownPaymentDto | null>(null)
  const [serviceType, setServiceType] = useState<InvoiceServiceType>('delivery')
  const [customServiceName, setCustomServiceName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryPricingMode, setDeliveryPricingMode] = useState<DeliveryPricingMode>('shipment')
  const [deliveryShipmentQty, setDeliveryShipmentQty] = useState(1)
  const [deliveryShipmentUnit, setDeliveryShipmentUnit] = useState('pengiriman')
  const [deliveryShipmentUnitPrice, setDeliveryShipmentUnitPrice] = useState(0)
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalDeliveryCharge[]>([])
  const [deliveryFleetId, setDeliveryFleetId] = useState<number | null>(null)
  const [deliveryFleetLabel, setDeliveryFleetLabel] = useState('')
  const [deliveryDriverId, setDeliveryDriverId] = useState<number | null>(null)
  const [deliveryDriverNameManual, setDeliveryDriverNameManual] = useState('')
  const [routeOrigin, setRouteOrigin] = useState('')
  const [routeDestination, setRouteDestination] = useState('')
  const [cargoDescription, setCargoDescription] = useState('')
  const [sjInputMode, setSjInputMode] = useState<'linked' | 'manual'>('linked')
  const [manualSjNumbers, setManualSjNumbers] = useState('')
  const [sjGate, setSjGate] = useState<{ mode: 'confirm' | 'clear'; sjNumber: string; sjStatus?: string; send: boolean } | null>(null)
  const [isCheckingSj, setIsCheckingSj] = useState(false)
  const [availableSJs, setAvailableSJs] = useState<CreateSJOption[]>([])
  const [selectedSJs, setSelectedSJs] = useState<CreateSJOption[]>([])
  const [sjSearch, setSjSearch] = useState('')
  const [sjDropdownOpen, setSjDropdownOpen] = useState(false)
  const [isLoadingSJs, setIsLoadingSJs] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const customerPickerRef = useRef<HTMLDivElement>(null)
  const projectPickerRef = useRef<HTMLDivElement>(null)
  const sjPickerRef = useRef<HTMLDivElement>(null)
  const bankAccounts = useSelector((state: RootState) => state.settings.bankAccounts).filter(b => b.is_active)
  const customers = useSelector((state: RootState) => state.master.customers)
  const fleets = useSelector((state: RootState) => state.master.fleets)
  const drivers = useSelector((state: RootState) => state.master.drivers)
  const [scopeMode, setScopeMode] = useState<'project' | 'customer'>('project')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)

  const {
    header, taxPercent, taxEnabled, pphPercent, pphEnabled,
    insuranceEnabled, insuranceAmount,
    selectedProject, updateHeader, selectProject,
    toggleTax, setTaxPercent, togglePph, setPphPercent,
    toggleInsurance, setInsuranceAmount,
    isDueDatePast, projects,
  } = useInvoiceForm()

  const {
    items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, calculateTax, totalAmount,
  } = useInvoiceItems()

  useEffect(() => {
    if (role !== null && role !== 'super_admin' && role !== 'admin_finance') {
      pushToast({ title: 'Akses Ditolak', description: 'Anda tidak memiliki akses ke halaman ini.', variant: 'error' })
      router.replace('/surat-jalan')
    }
  }, [role, router, pushToast])

  useEffect(() => { dispatch(fetchBankAccounts()) }, [dispatch])
  useEffect(() => {
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, customers.length])
  useEffect(() => {
    if (!fleets.length) dispatch(fetchFleets())
    if (!drivers.length) dispatch(fetchDrivers())
  }, [dispatch, fleets.length, drivers.length])

  useEffect(() => {
    if (bankAccounts.length > 0 && bankAccountId === null) {
      setBankAccountId(bankAccounts[0].id)
    }
  }, [bankAccounts, bankAccountId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!customerPickerRef.current?.contains(event.target as Node)) {
        setCustomerDropdownOpen(false)
      }
      if (!projectPickerRef.current?.contains(event.target as Node)) {
        setProjectDropdownOpen(false)
      }
      if (!sjPickerRef.current?.contains(event.target as Node)) {
        setSjDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    const list = q
      ? projects.filter(p =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.customer.name.toLowerCase().includes(q)
        )
      : projects
    return list.slice(0, 25)
  }, [projects, projectSearch])

  useEffect(() => {
    const effective = resolveEffectiveInvoiceServiceType(serviceType, customServiceName)
    const isDelivery = effective !== 'rental'
    const projectScope = scopeMode === 'project'
    const projectId = projectScope ? selectedProject?.id ?? null : null
    const customerId = scopeMode === 'customer'
      ? selectedCustomer?.id ?? null
      : selectedProject?.customer.id ?? null
    // UUID dipakai untuk memfilter SJ di server (project_uuid / customer_uuid)
    // agar limit pagination berlaku pada SJ scope ini, bukan global.
    const scopeUuid = projectScope
      ? selectedProject?.uuid ?? null
      : selectedCustomer?.uuid ?? null

    if (!isDelivery || !customerId || !scopeUuid) {
      setAvailableSJs([])
      setSelectedSJs([])
      setSjSearch('')
      setSjDropdownOpen(false)
      return
    }

    let cancelled = false
    setIsLoadingSJs(true)
    // Filter di server: scope (project/customer) + hanya SJ yang belum punya
    // invoice (invoice_status=no_invoice). limit dibatasi 100 (maksimum yang
    // divalidasi backend; sebelumnya 200 → request ditolak 422 → dropdown kosong).
    // Status assigned & delivered tetap difilter di client karena param `status`
    // hanya menerima satu nilai.
    const scopeParam = projectScope
      ? `project_uuid=${encodeURIComponent(scopeUuid)}`
      : `customer_uuid=${encodeURIComponent(scopeUuid)}`
    apiRequest<CreateSJOption[]>(`/surat-jalan?${scopeParam}&status=all&invoice_status=no_invoice&period=all&page=1&limit=100`, { method: 'GET' })
      .then(response => {
        if (cancelled) return
        const rows = response.data.filter(sj => {
          const sameScope = projectId
            ? Number(sj.project_id) === Number(projectId)
            : !sj.project_id && Number(sj.customer_id) === Number(customerId)
          return sameScope && ['assigned', 'delivered'].includes(sj.status) && !sj.invoice_id
        })
        setAvailableSJs(rows)
      })
      .catch(() => {
        if (!cancelled) setAvailableSJs([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSJs(false)
      })

    return () => { cancelled = true }
  }, [serviceType, customServiceName, scopeMode, selectedProject, selectedCustomer])

  const filteredSJs = useMemo(() => {
    const selected = new Set(selectedSJs.map(sj => sj.uuid))
    const q = sjSearch.trim().toLowerCase()
    return availableSJs
      .filter(sj => !selected.has(sj.uuid))
      .filter(sj => !q ||
        sj.sj_number.toLowerCase().includes(q) ||
        sj.origin.toLowerCase().includes(q) ||
        sj.destination.toLowerCase().includes(q)
      )
      .slice(0, 25)
  }, [availableSJs, selectedSJs, sjSearch])

  if (role === null || (role !== 'super_admin' && role !== 'admin_finance')) return null

  const effectiveServiceType = resolveEffectiveInvoiceServiceType(serviceType, customServiceName)
  const isDeliveryLikeService = effectiveServiceType !== 'rental'
  const serviceLabel = serviceType === 'delivery'
    ? 'Pengiriman'
    : serviceType === 'rental'
      ? 'Penyewaan'
      : customServiceName || 'Lainnya'
  const deliveryShipmentSubtotal = Math.round(Number(deliveryShipmentQty || 0) * Number(deliveryShipmentUnitPrice || 0))
  const deliverySubtotalAmount = isDeliveryLikeService
    ? deliveryPricingMode === 'item'
      ? subtotalAmount
      : deliveryShipmentSubtotal
    : subtotalAmount
  const additionalChargesTotal = isDeliveryLikeService
    ? additionalCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0)
    : 0
  const fleetOptions = fleets
    .filter(fleet => fleet.status === 'active' && !fleet.is_tbd)
    .map(fleet => ({
      id:    fleet.id,
      label: `${fleet.name}${fleet.plate_number ? ` (${fleet.plate_number})` : ''}`,
    }))
  const driverOptions = drivers
    .filter(driver => driver.status === 'active')
    .map(driver => ({ id: driver.id, label: driver.name }))
  const invoiceSubtotalAmount = deliverySubtotalAmount + additionalChargesTotal
  const taxAmount = taxEnabled ? calculateTax(invoiceSubtotalAmount, taxPercent) : 0
  const pphAmount = pphEnabled ? Math.round(invoiceSubtotalAmount * pphPercent / 100) : 0
  const nettoAmount = totalAmount(invoiceSubtotalAmount, taxAmount) - pphAmount + (insuranceEnabled ? insuranceAmount : 0)

  const addAdditionalCharge = () => {
    setAdditionalCharges(prev => [...prev, { uuid: crypto.randomUUID(), name: '', amount: 0 }])
  }

  const updateAdditionalCharge = (uuid: string, field: keyof Omit<AdditionalDeliveryCharge, 'uuid'>, value: string | number) => {
    setAdditionalCharges(prev => prev.map(charge => (
      charge.uuid === uuid ? { ...charge, [field]: value } : charge
    )))
  }

  const removeAdditionalCharge = (uuid: string) => {
    setAdditionalCharges(prev => prev.filter(charge => charge.uuid !== uuid))
  }

  const syncItemPricingFromCargo = (item: typeof items[number], syncQty = false, syncUnit = false) => {
    const qty = syncQty ? Number(item.cargo_qty ?? item.qty ?? 0) : Number(item.qty ?? 0)
    return {
      ...item,
      qty,
      unit: syncUnit ? item.cargo_unit ?? item.unit : item.unit,
      subtotal: Math.round(qty * Number(item.unit_price || 0)),
    }
  }

  const updateDeliveryPricingMode = (mode: DeliveryPricingMode) => {
    setDeliveryPricingMode(mode)
    if (mode === 'item') {
      resetItems(items.map(item => syncItemPricingFromCargo(item, true, true)))
    }
  }

  const updateDeliveryShipmentPricing = (field: 'qty' | 'unit' | 'unit_price', value: string | number) => {
    if (field === 'qty') setDeliveryShipmentQty(Number(value || 0))
    if (field === 'unit') setDeliveryShipmentUnit(value === '' ? '' : String(value ?? 'pengiriman'))
    if (field === 'unit_price') setDeliveryShipmentUnitPrice(Number(value || 0))
  }

  const updateDeliveryItem = (uuid: string, field: string, value: unknown) => {
    if (deliveryPricingMode === 'item' && (field === 'cargo_qty' || field === 'cargo_unit')) {
      resetItems(items.map(item => {
        if (item.uuid !== uuid) return item
        return syncItemPricingFromCargo({ ...item, [field]: value })
      }))
      return
    }
    updateItem(uuid, field, value)
  }

  const updateDeliveryPrice = (uuid: string, field: string, value: unknown) => {
    if (deliveryPricingMode === 'item' && field === 'unit_price') {
      resetItems(items.map(item => {
        if (item.uuid !== uuid) return item
        return syncItemPricingFromCargo({ ...item, unit_price: Number(value || 0) })
      }))
      return
    }
    updateItem(uuid, field, value)
  }

  const switchSjInputMode = (mode: 'linked' | 'manual') => {
    setSjInputMode(mode)
    setSjDropdownOpen(false)
    setSjSearch('')
    if (mode === 'manual') {
      const selectedIds = new Set(selectedSJs.map(sj => sj.id))
      setSelectedSJs([])
      resetItems(items.filter(item => !item.source_sj_id || !selectedIds.has(Number(item.source_sj_id))))
    } else {
      setManualSjNumbers('')
    }
  }

  const mapSjItemsToInvoiceItems = (sj: CreateSJOption) => {
    const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
    const fleetLabel = fleetIsTbd
      ? 'TBD'
      : `${sj.fleet?.name ?? 'Armada'} (${sj.fleet?.plate_number ?? '-'})`
    const rows = sj.items && sj.items.length > 0 ? sj.items : [{
      description: sj.cargo_description || `Muatan ${sj.sj_number}`,
      qty: 1,
      unit: 'unit',
      weight: null,
      volume: null,
      notes: null,
    }]

    return rows.map((sjItem, idx) => {
      const cargoQty = Number(sjItem.qty || 1)
      const pricingQty = deliveryPricingMode === 'item' ? cargoQty : 1
      const pricingUnit = deliveryPricingMode === 'item' ? sjItem.unit || 'unit' : 'unit'
      return {
        uuid: crypto.randomUUID(),
        fleet_id: fleetIsTbd ? null : sj.fleet_id,
        fleet: sj.fleet,
        driver_id: sj.driver_id,
        driver: null,
        driver_name_manual: sj.driver_name_manual ?? '',
        fleet_label: fleetLabel,
        description: sjItem.description || sj.cargo_description || `Item ${idx + 1}`,
        period_start: null,
        period_end: null,
        rental_duration_years: 0,
        rental_duration_months: 0,
        rental_duration_days: 0,
        rental_duration_hours: 0,
        qty: pricingQty,
        unit: pricingUnit,
        cargo_qty: cargoQty,
        cargo_unit: sjItem.unit || null,
        cargo_weight: sjItem.weight === null || sjItem.weight === undefined ? null : Number(sjItem.weight),
        cargo_volume: sjItem.volume === null || sjItem.volume === undefined ? null : Number(sjItem.volume),
        cargo_notes: sjItem.notes || null,
        unit_price: 0,
        subtotal: 0,
        sort_order: items.length + idx,
        source_sj_id: sj.id,
      }
    })
  }

  const selectLinkedSJ = (sj: CreateSJOption) => {
    setSjInputMode('linked')
    setManualSjNumbers('')
    setSelectedSJs(prev => [...prev, sj])
    resetItems([...items, ...mapSjItemsToInvoiceItems(sj)].map((item, idx) => ({ ...item, sort_order: idx })))
    setSjSearch('')
    setSjDropdownOpen(false)

    if (!routeOrigin && sj.origin) setRouteOrigin(sj.origin)
    if (!routeDestination && sj.destination) setRouteDestination(sj.destination)
    if (!cargoDescription && sj.cargo_description) setCargoDescription(sj.cargo_description)
    if (!deliveryFleetId && sj.fleet_id && !sj.fleet?.is_tbd) setDeliveryFleetId(sj.fleet_id)
    if (!deliveryFleetLabel && sj.fleet && !sj.fleet.is_tbd) setDeliveryFleetLabel(`${sj.fleet.name} (${sj.fleet.plate_number})`)
    if (!deliveryDriverId && sj.driver_id) setDeliveryDriverId(sj.driver_id)
    if (!deliveryDriverNameManual && sj.driver_name_manual) setDeliveryDriverNameManual(sj.driver_name_manual)
  }

  const detachLinkedSJ = (sj: CreateSJOption) => {
    setSelectedSJs(prev => prev.filter(row => row.uuid !== sj.uuid))
    resetItems(items.filter(item => Number(item.source_sj_id || 0) !== Number(sj.id)).map((item, idx) => ({ ...item, sort_order: idx })))
  }

  const getDto = (sendImmediately = false, overwriteSjConfirmed = false) => {
    const baseItems = items.map((item, idx) => {
      const isDelivery = isDeliveryLikeService
      const isSourceSjItem = isDelivery && Boolean(item.source_sj_id)
      const isPricingRow = !isDelivery || deliveryPricingMode === 'item' || idx === 0
        return {
          source_sj_id: item.source_sj_id ?? null,
          fleet_id: isDelivery
            ? isSourceSjItem ? item.fleet_id ?? null : deliveryFleetId
            : item.fleet_id ?? null,
          driver_id: isDelivery
            ? isSourceSjItem ? item.driver_id ?? null : deliveryDriverId
            : item.driver_id ?? null,
          driver_name_manual: isDelivery
            ? isSourceSjItem ? item.driver_name_manual || null : deliveryDriverNameManual || null
            : item.driver_name_manual || null,
          fleet_label: isDelivery
            ? isSourceSjItem
              ? item.fleet_label
              : deliveryFleetLabel || (serviceType === 'other' ? customServiceName.trim() || 'Lainnya' : 'Pengiriman')
            : item.fleet_label,
        description: item.description,
        period_start: item.period_start,
        period_end: item.period_end,
        rental_duration_years: isDelivery ? 0 : item.rental_duration_years ?? 0,
        rental_duration_months: isDelivery ? 0 : item.rental_duration_months ?? 0,
        rental_duration_days: isDelivery ? 0 : item.rental_duration_days ?? 0,
        rental_duration_hours: isDelivery ? 0 : item.rental_duration_hours ?? 0,
        qty: isDelivery && deliveryPricingMode === 'shipment' && idx === 0
          ? deliveryShipmentQty
          : isPricingRow ? item.qty : 1,
        unit: isDelivery && deliveryPricingMode === 'shipment' && idx === 0
          ? deliveryShipmentUnit
          : isPricingRow ? item.unit : 'unit',
        cargo_qty: item.cargo_qty ?? (isDelivery ? item.qty : null),
        cargo_unit: item.cargo_unit ?? (isDelivery ? item.unit : null),
        cargo_weight: item.cargo_weight ?? null,
        cargo_volume: item.cargo_volume ?? null,
        cargo_notes: item.cargo_notes ?? null,
        unit_price: isDelivery && deliveryPricingMode === 'shipment' && idx === 0
          ? deliveryShipmentUnitPrice
          : isPricingRow ? item.unit_price : 0,
          sort_order: idx,
      }
    })
    const billingItems = isDeliveryLikeService && deliveryPricingMode === 'shipment' && baseItems.length === 0 && deliveryShipmentSubtotal > 0
      ? [{
          fleet_id: deliveryFleetId,
          source_sj_id: null,
          driver_id: deliveryDriverId,
          driver_name_manual: deliveryDriverNameManual || null,
          fleet_label: deliveryFleetLabel || (serviceType === 'other' ? customServiceName.trim() || 'Lainnya' : 'Pengiriman'),
          description: serviceType === 'other' ? customServiceName.trim() || 'Jasa Lainnya' : 'Harga Pengiriman',
          period_start: null,
          period_end: null,
          rental_duration_years: 0,
          rental_duration_months: 0,
          rental_duration_days: 0,
          rental_duration_hours: 0,
          qty: deliveryShipmentQty,
          unit: deliveryShipmentUnit,
          cargo_qty: null,
          cargo_unit: null,
          cargo_weight: null,
          cargo_volume: null,
          cargo_notes: null,
          unit_price: deliveryShipmentUnitPrice,
          sort_order: 0,
        }]
      : []
    const chargeItems = isDeliveryLikeService
      ? additionalCharges
        .filter(charge => charge.name.trim() && Number(charge.amount || 0) > 0)
        .map((charge, idx) => ({
          fleet_id: null,
          source_sj_id: null,
          driver_id: null,
          driver_name_manual: null,
          fleet_label: 'Pembiayaan Lainnya',
          description: charge.name.trim(),
          period_start: null,
          period_end: null,
          rental_duration_years: 0,
          rental_duration_months: 0,
          rental_duration_days: 0,
          rental_duration_hours: 0,
          qty: 1,
          unit: 'pengiriman',
          cargo_qty: null,
          cargo_unit: null,
          cargo_weight: null,
          cargo_volume: null,
          cargo_notes: null,
          unit_price: Number(charge.amount || 0),
          sort_order: baseItems.length + billingItems.length + idx,
        }))
      : []

    return {
      project_id: scopeMode === 'project' ? header.project_id : null,
      customer_id: scopeMode === 'customer' ? selectedCustomer?.id ?? null : null,
      invoice_date: header.invoice_date,
      due_date: header.due_date,
      service_type: serviceType,
      custom_service_name: serviceType === 'other' ? customServiceName.trim() : null,
      delivery_date: isDeliveryLikeService ? deliveryDate || null : null,
      delivery_pricing_mode: isDeliveryLikeService ? deliveryPricingMode : 'shipment',
      payment_method: paymentMethod,
      bank_account_id: paymentMethod === 'transfer' ? bankAccountId : null,
      tax_percent: taxEnabled ? taxPercent : 0,
      pph_percent: pphEnabled ? pphPercent : 0,
      insurance_amount: insuranceEnabled ? insuranceAmount : 0,
      notes: header.notes || null,
      origin: isDeliveryLikeService ? routeOrigin || null : null,
      destination: isDeliveryLikeService ? routeDestination || null : null,
      cargo_description: isDeliveryLikeService ? cargoDescription || null : null,
      manual_sj_numbers: isDeliveryLikeService && sjInputMode === 'manual' ? manualSjNumbers.trim() || null : null,
      linked_sj_uuids: isDeliveryLikeService && sjInputMode === 'linked' ? selectedSJs.map(sj => sj.uuid) : [],
      items: [...baseItems, ...billingItems, ...chargeItems],
      send_immediately: sendImmediately,
      overwrite_sj_confirmed: overwriteSjConfirmed,
      // Saat create, kirim DP kalau ada (toggle ON dengan amount > 0).
      // Kalau `null` kita skip key — BE tidak butuh field ini saat create kosong.
      ...(downPayment ? { down_payment: downPayment } : {}),
    }
  }

  const validate = () => {
    const result = validateCreateInvoice(getDto())
    if (isDeliveryLikeService) {
      additionalCharges.forEach((charge, idx) => {
        const hasName = Boolean(charge.name.trim())
        const hasAmount = Number(charge.amount || 0) > 0
        if (hasName || hasAmount) {
          if (!hasName) result.errors[`additional_charges.${idx}.name`] = 'Nama pembiayaan wajib diisi'
          if (!hasAmount) result.errors[`additional_charges.${idx}.amount`] = 'Nominal harus lebih dari 0'
        }
      })
      result.valid = Object.keys(result.errors).length === 0
    }
    if (downPayment) {
      if (!downPayment.payment_date) result.errors.down_payment = 'Tanggal DP wajib diisi'
      if (downPayment.amount <= 0) result.errors.down_payment = 'Nominal DP harus lebih dari 0'
      result.valid = Object.keys(result.errors).length === 0
    }
    if (isDeliveryLikeService && sjInputMode === 'manual' && manualSjNumbers.trim().includes(',')) {
      result.errors.manual_sj_numbers = 'Masukkan tepat satu nomor SJ (tanpa koma) agar bisa dibuat otomatis.'
      result.valid = false
    }
    setErrors(result.errors)
    if (!result.valid) {
      pushToast({
        title: 'Invoice belum lengkap',
        description: Object.values(result.errors)[0] || 'Lengkapi data invoice terlebih dahulu.',
        variant: 'error',
      })
    }
    return result.valid
  }

  const isManualSjMode = () =>
    isDeliveryLikeService && sjInputMode === 'manual' && manualSjNumbers.trim().length > 0

  // Kirim invoice ke backend (dipakai setelah gate SJ lolos).
  const doSubmit = async (send: boolean, overwriteConfirmed = false, disableAutoSj = false) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const dto = { ...getDto(send, overwriteConfirmed), ...(disableAutoSj ? { auto_create_sj: false, manual_sj_numbers: null } : {}) }
    const result = await dispatch(createInvoice(dto))
    setIsSubmitting(false)
    if (createInvoice.fulfilled.match(result)) {
      pushToast({
        title: send ? 'Invoice Dikirim' : 'Invoice Disimpan',
        description: `Invoice #${result.payload.invoice_number} berhasil dibuat${send ? ' dan dikirim' : ' sebagai draft'}.`,
        variant: 'success',
      })
      router.push('/invoice')
      return
    }
    pushToast({ title: 'Gagal membuat invoice', description: (result.payload as string) || 'Invoice tidak tersimpan.', variant: 'error' })
  }

  // Gate: cek nomor SJ manual sebelum submit.
  const submitWithSjGate = async (send: boolean) => {
    if (isSubmitting || isCheckingSj) return
    setIsCheckingSj(true)
    try {
      if (!validate()) return
      if (!isManualSjMode()) { await doSubmit(send); return }

      const sjNumber = manualSjNumbers.trim()
      let lookup: SjLookupResult | null
      try {
        lookup = await suratJalanRepository.getBySjNumber(sjNumber)
      } catch {
        pushToast({ title: 'Gagal cek nomor SJ', description: 'Tidak bisa memverifikasi nomor SJ. Coba lagi.', variant: 'error' })
        return
      }

      if (lookup && lookup.invoice_id) {
        pushToast({
          title: 'Nomor SJ dipakai invoice lain',
          description: `SJ ${sjNumber} sudah tertaut ke invoice ${lookup.invoice_number || 'lain'}. Ganti nomor SJ.`,
          variant: 'error',
        })
        return
      }
      if (lookup) {
        setSjGate({ mode: 'confirm', sjNumber, sjStatus: lookup.status, send })
        return
      }
      await doSubmit(send)
    } finally {
      setIsCheckingSj(false)
    }
  }

  const handleSaveDraft = () => submitWithSjGate(false)
  const handleSaveAndSend = () => submitWithSjGate(true)

  const selectCustomer = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId) || null
    setSelectedCustomer(customer)
    setCustomerSearch(customer?.name ?? '')
    setCustomerDropdownOpen(false)
    setSelectedSJs([])
    setSjSearch('')
    setManualSjNumbers('')
    resetItems(items.filter(item => !item.source_sj_id))
    updateHeader('project_id', null)
    if (customer?.is_pkp) {
      toggleTax(true)
    } else {
      toggleTax(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} />
          Kembali ke Daftar
        </button>
        <div className="text-xs text-gray-500">Dashboard / Invoice / Buat Invoice Baru</div>
        <h1 className="text-2xl font-bold">Buat Invoice Baru</h1>
      </div>

      <div ref={formRef} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Section A: Header */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold">Header Invoice</h2>
              <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                {(['project', 'customer'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (scopeMode === mode) return
                      setScopeMode(mode)
                      setSelectedCustomer(null)
                      setCustomerSearch('')
                      setCustomerDropdownOpen(false)
                      setSelectedSJs([])
                      setSjSearch('')
                      setManualSjNumbers('')
                      resetItems(items.filter(item => !item.source_sj_id))
                      updateHeader('project_id', null)
                      setErrors(prev => ({ ...prev, project_id: '' }))
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
            <div className="space-y-4">
              {scopeMode === 'project' ? (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Pilih Proyek *</label>
                  <div ref={projectPickerRef} className="relative">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Search size={15} />
                      </span>
                      <input
                        className={`form-input w-full ${errors.project_id ? 'border-red-400' : ''}`}
                        style={{ paddingLeft: 42, paddingRight: 40 }}
                        value={projectSearch}
                        placeholder={selectedProject ? `${selectedProject.code} — ${selectedProject.name}` : 'Ketik kode atau nama proyek...'}
                        onFocus={() => { setProjectDropdownOpen(true); setProjectSearch('') }}
                        onChange={event => {
                          setProjectSearch(event.target.value)
                          setProjectDropdownOpen(true)
                          setErrors(prev => ({ ...prev, project_id: '' }))
                        }}
                        onBlur={() => setProjectSearch('')}
                      />
                      <button
                        type="button"
                        onClick={() => setProjectDropdownOpen(open => !open)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                        aria-label="Buka daftar proyek"
                      >
                        <ChevronDown size={16} className="text-gray-400" />
                      </button>
                    </div>
                    {projectDropdownOpen && (
                      <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredProjects.length > 0 ? filteredProjects.map(p => {
                            const selected = selectedProject?.id === p.id
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={event => {
                                  event.preventDefault()
                                  selectProject(p.id)
                                  setSelectedCustomer(null)
                                  setCustomerSearch('')
                                  setSelectedSJs([])
                                  setSjSearch('')
                                  setManualSjNumbers('')
                                  resetItems(items.filter(item => !item.source_sj_id))
                                  setErrors(prev => ({ ...prev, project_id: '' }))
                                  setProjectDropdownOpen(false)
                                  setProjectSearch('')
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                              >
                                <span className="mt-0.5 w-4 text-green-600 shrink-0">{selected && <Check size={14} />}</span>
                                <span className="min-w-0">
                                  <span className="block font-medium text-gray-800 truncate">{p.code} — {p.name}</span>
                                  <span className="block text-xs text-gray-500 truncate">{p.customer.name}</span>
                                </span>
                              </button>
                            )
                          }) : (
                            <div className="px-3 py-3 text-sm text-gray-500">Proyek tidak ditemukan</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id}</p>}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Pilih Customer *</label>
                  <div ref={customerPickerRef} className="relative">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Search size={15} />
                      </span>
                      <input
                        className={`form-input w-full ${errors.project_id ? 'border-red-400' : ''}`}
                        style={{ paddingLeft: 42, paddingRight: 40 }}
                        value={customerSearch}
                        placeholder="Ketik nama customer..."
                        onFocus={() => setCustomerDropdownOpen(true)}
                        onChange={event => {
                          setCustomerSearch(event.target.value)
                          setSelectedCustomer(null)
                          setCustomerDropdownOpen(true)
                          setErrors(prev => ({ ...prev, project_id: '' }))
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
                                onClick={() => { selectCustomer(customer.id); setErrors(prev => ({ ...prev, project_id: '' })) }}
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
                  {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id}</p>}
                </div>
              )}

              {scopeMode === 'project' && selectedProject && (
                <>
                  {/* Customer (readonly) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Customer</label>
                    <div className="form-input bg-gray-50 flex items-center gap-2">
                      <span>{selectedProject.customer.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-auto" style={{ backgroundColor: selectedProject.customer.is_pkp ? '#DCFCE7' : '#F3F4F6', color: selectedProject.customer.is_pkp ? '#166534' : '#6B7280' }}>
                        {selectedProject.customer.is_pkp ? 'PKP' : 'Non-PKP'}
                      </span>
                    </div>
                    {selectedProject.customer.npwp && <p className="text-xs text-gray-500 mt-1">NPWP: {selectedProject.customer.npwp}</p>}
                  </div>

                  {/* No. Kontrak (readonly) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">No. Kontrak</label>
                    <div className="form-input bg-gray-50 text-gray-500 italic">{selectedProject.contract_number}</div>
                  </div>
                </>
              )}

              {scopeMode === 'customer' && selectedCustomer && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Customer</label>
                  <div className="form-input bg-gray-50 flex items-center gap-2">
                    <span>{selectedCustomer.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-auto" style={{ backgroundColor: selectedCustomer.is_pkp ? '#DCFCE7' : '#F3F4F6', color: selectedCustomer.is_pkp ? '#166534' : '#6B7280' }}>
                      {selectedCustomer.is_pkp ? 'PKP' : 'Non-PKP'}
                    </span>
                  </div>
                  {selectedCustomer.npwp && <p className="text-xs text-gray-500 mt-1">NPWP: {selectedCustomer.npwp}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Invoice *</label>
                  <input type="date" className={`form-input w-full ${errors.invoice_date ? 'border-red-400' : ''}`} value={header.invoice_date} onChange={e => updateHeader('invoice_date', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Jatuh Tempo *</label>
                  <input type="date" className={`form-input w-full ${errors.due_date ? 'border-red-400' : ''}`} value={header.due_date} onChange={e => updateHeader('due_date', e.target.value)} />
                  {isDueDatePast && <p className="text-xs text-amber-600 mt-1">⚠ Tanggal jatuh tempo sudah terlewat</p>}
                </div>
              </div>

              {/* No. Invoice (readonly) */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">No. Invoice</label>
                <div className="form-input bg-gray-50 text-gray-500 italic font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                  (otomatis oleh sistem)
                </div>
                <p className="text-xs text-gray-400 mt-1">Nomor akan digenerate saat invoice disimpan</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Jenis Jasa *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'delivery', label: 'Jasa Pengiriman', icon: Truck, help: 'Invoice dapat dikaitkan dengan Surat Jalan.' },
                    { value: 'rental', label: 'Jasa Penyewaan', icon: KeyRound, help: 'Invoice tidak memakai kaitan Surat Jalan.' },
                    { value: 'other', label: 'Jasa Lainnya', icon: Wrench, help: 'Nama jasa diisi manual, rincian mengikuti pengiriman.' },
                  ] as const).map(opt => {
                    const Icon = opt.icon
                    const selected = serviceType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setServiceType(opt.value)
                          if (opt.value === 'rental') {
                            setSelectedSJs([])
                            setSjSearch('')
                            setManualSjNumbers('')
                            resetItems(items.filter(item => !item.source_sj_id))
                          }
                          setErrors(prev => ({ ...prev, service_type: '', custom_service_name: '' }))
                        }}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                          selected ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={selected ? 'text-green-700' : 'text-gray-500'} />
                        <span>
                          <span className="block text-sm font-semibold">{opt.label}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{opt.help}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                {errors.service_type && <p className="text-xs text-red-500 mt-1">{errors.service_type}</p>}
                <p className="text-xs text-amber-600 mt-2">Jenis jasa dikunci setelah invoice dibuat. Jika salah pilih, void invoice lalu buat invoice baru.</p>
              </div>

              {serviceType === 'other' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nama Jasa *</label>
                  <input
                    className={`form-input w-full ${errors.custom_service_name ? 'border-red-400' : ''}`}
                    value={customServiceName}
                    onChange={event => {
                      setCustomServiceName(event.target.value)
                      setErrors(prev => ({ ...prev, custom_service_name: '' }))
                    }}
                    placeholder="Contoh: Jasa Bongkar Muat"
                    maxLength={100}
                  />
                  {errors.custom_service_name && <p className="text-xs text-red-500 mt-1">{errors.custom_service_name}</p>}
                </div>
              )}

              {isDeliveryLikeService && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Pengiriman</label>
                  <input
                    type="date"
                    className="form-input w-full sm:w-60"
                    value={deliveryDate}
                    onChange={event => setDeliveryDate(event.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Opsional. Tampil di PDF invoice di atas Nomor SJ.</p>
                </div>
              )}

              {isDeliveryLikeService && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nomor SJ</label>
                  <div className="inline-flex rounded-lg border overflow-hidden mb-2" style={{ borderColor: 'var(--border-card)' }}>
                    {([
                      { value: 'linked', label: 'Pilih SJ Database' },
                      { value: 'manual', label: 'Input Manual' },
                    ] as const).map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => switchSjInputMode(option.value)}
                        className="px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: sjInputMode === option.value ? 'var(--green-primary)' : 'white',
                          color: sjInputMode === option.value ? 'white' : '#374151',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {sjInputMode === 'linked' ? (
                    <div className="space-y-2">
                      <div ref={sjPickerRef} className="relative">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Search size={15} />
                          </span>
                          <input
                            className="form-input w-full"
                            style={{ paddingLeft: 42, paddingRight: 40 }}
                            value={sjSearch}
                            placeholder={scopeMode === 'project' ? 'Ketik nomor SJ proyek...' : 'Ketik nomor SJ customer...'}
                            onFocus={() => setSjDropdownOpen(true)}
                            onChange={event => {
                              setSjSearch(event.target.value)
                              setSjDropdownOpen(true)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setSjDropdownOpen(open => !open)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                            aria-label="Buka daftar SJ"
                          >
                            <ChevronDown size={16} className="text-gray-400" />
                          </button>
                        </div>
                        {sjDropdownOpen && (
                          <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                            <div className="max-h-64 overflow-y-auto">
                              {isLoadingSJs ? (
                                <div className="px-3 py-3 text-sm text-gray-500">Memuat daftar SJ...</div>
                              ) : filteredSJs.length > 0 ? filteredSJs.map(sj => (
                                <button
                                  key={sj.uuid}
                                  type="button"
                                  onClick={() => selectLinkedSJ(sj)}
                                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                                >
                                  <span className="mt-0.5 w-4 text-green-600"><Check size={14} /></span>
                                  <span className="min-w-0">
                                    <span className="block font-medium text-gray-800 truncate">{sj.sj_number}</span>
                                    <span className="block text-xs text-gray-500 truncate">{sj.origin} - {sj.destination}</span>
                                  </span>
                                </button>
                              )) : (
                                <div className="px-3 py-3 text-sm text-gray-500">
                                  {(scopeMode === 'project' ? selectedProject : selectedCustomer) ? 'SJ tersedia tidak ditemukan' : 'Pilih customer/proyek terlebih dahulu'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedSJs.length > 0 && (
                        <div className="space-y-2">
                          {selectedSJs.map(sj => (
                            <div key={sj.uuid} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-card)' }}>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-800 truncate">{sj.sj_number}</div>
                                <div className="text-xs text-gray-500 truncate">{sj.origin} - {sj.destination}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => detachLinkedSJ(sj)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium text-red-600 hover:bg-red-50"
                                style={{ borderColor: '#FCA5A5' }}
                              >
                                <X size={13} />
                                Lepaskan SJ
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        className="form-input w-full"
                        value={manualSjNumbers}
                        onChange={event => setManualSjNumbers(event.target.value)}
                        placeholder="Contoh: SJ-2026-07-001"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Masukkan <strong>satu</strong> nomor SJ. Saat invoice dibuat, SJ dengan nomor ini otomatis dibuat/diperbarui dan terlampir.
                      </p>
                      {errors.manual_sj_numbers && <p className="text-xs text-red-600 mt-1">{errors.manual_sj_numbers}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Catatan */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Catatan ke Customer</label>
                <textarea className="form-input w-full text-sm" rows={2} value={header.notes} onChange={e => updateHeader('notes', e.target.value)} placeholder="Catatan tambahan yang akan tampil di invoice..." />
              </div>
            </div>
          </div>

          {/* Section B: Items */}
          {isDeliveryLikeService ? (
            <>
              <DeliveryOperationsSection
                fleetId={deliveryFleetId}
                fleetLabel={deliveryFleetLabel}
                driverId={deliveryDriverId}
                driverNameManual={deliveryDriverNameManual}
                fleetOptions={fleetOptions}
                driverOptions={driverOptions}
                onChangeFleetId={setDeliveryFleetId}
                onChangeFleetLabel={setDeliveryFleetLabel}
                onChangeDriverId={setDeliveryDriverId}
                onChangeDriverNameManual={setDeliveryDriverNameManual}
              />
              <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
                <div className="text-sm font-semibold mb-4">Rute & Muatan</div>
                <label className="text-xs font-medium" style={{ color: '#374151' }}>
                  Lokasi Asal
                  <input
                    className="form-input w-full mt-1"
                    value={routeOrigin}
                    onChange={event => setRouteOrigin(event.target.value)}
                    placeholder="contoh: Gudang PNJ, Jl. Arteri Supadio Pontianak"
                  />
                </label>

                <div className="flex items-end gap-3 mt-4">
                  <label className="text-xs font-medium flex-1" style={{ color: '#374151' }}>
                    Lokasi Tujuan
                    <input
                      className="form-input w-full mt-1"
                      value={routeDestination}
                      onChange={event => setRouteDestination(event.target.value)}
                      placeholder="contoh: Lokasi PT. ATP BIO, Kubu Raya"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prevOrigin = routeOrigin
                      setRouteOrigin(routeDestination)
                      setRouteDestination(prevOrigin)
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
                    value={cargoDescription}
                    onChange={event => setCargoDescription(event.target.value)}
                    placeholder="contoh: Kendaraan operasional untuk periode sewa"
                  />
                </label>
              </div>
              <DeliveryInvoiceItemsSection
                items={items}
                onAdd={addItem}
                onChange={updateDeliveryItem}
                onRemove={removeItem}
                errors={errors}
              />
              <DeliveryPricingSection
                items={items}
                onChange={updateDeliveryPrice}
                pricingMode={deliveryPricingMode}
                onChangePricingMode={updateDeliveryPricingMode}
                shipmentQty={deliveryShipmentQty}
                shipmentUnit={deliveryShipmentUnit}
                shipmentUnitPrice={deliveryShipmentUnitPrice}
                onChangeShipmentPricing={updateDeliveryShipmentPricing}
                additionalCharges={additionalCharges}
                onAddAdditionalCharge={addAdditionalCharge}
                onChangeAdditionalCharge={updateAdditionalCharge}
                onRemoveAdditionalCharge={removeAdditionalCharge}
                errors={errors}
              />
            </>
          ) : (
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold">Rincian Item</h2>
                <button onClick={addItem} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
                  <Plus size={14} />
                  Tambah Item
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Tambahkan baris item untuk setiap unit kendaraan</p>
              {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}

              {items.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl py-12 text-center" style={{ borderColor: 'var(--border-card)' }}>
                  <p className="text-gray-500 font-medium">Belum ada item</p>
                  <p className="text-xs text-gray-400 mt-1">Klik &ldquo;+ Tambah Item&rdquo; untuk menambahkan unit kendaraan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <InvoiceItemRow
                      key={item.uuid}
                      item={item}
                      index={idx}
                      onChange={updateItem}
                      onRemove={removeItem}
                      errors={errors}
                      onDragStart={i => setDragFrom(i)}
                      onDragOver={i => setDragOver(i)}
                      onDrop={() => {
                        if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
                          reorderItems(dragFrom, dragOver)
                        }
                        setDragFrom(null)
                        setDragOver(null)
                      }}
                      serviceType={effectiveServiceType}
                    />
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <button
                  onClick={addItem}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:bg-green-50"
                  style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
                >
                  <Plus size={16} />
                  Tambah Item
                </button>
              )}
            </div>
          )}

          {/* Section C: Tax */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Kalkulasi Pajak</h2>
            <InvoiceTaxCalculator
              subtotal={invoiceSubtotalAmount}
              taxPercent={taxPercent}
              taxEnabled={taxEnabled}
              pphPercent={pphPercent}
              pphEnabled={pphEnabled}
              isPkp={scopeMode === 'project' ? selectedProject?.customer.is_pkp : selectedCustomer?.is_pkp}
              onToggleTax={toggleTax}
              onChangeTaxPercent={setTaxPercent}
              onTogglePph={togglePph}
              onChangePphPercent={setPphPercent}
              insuranceEnabled={insuranceEnabled}
              insuranceAmount={insuranceAmount}
              onToggleInsurance={toggleInsurance}
              onChangeInsuranceAmount={setInsuranceAmount}
            />
          </div>

          {/* Section D: Metode Pembayaran */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Metode Pembayaran *</h2>
            <div className="flex gap-2">
              {([
                { value: 'transfer', label: 'Transfer Bank' },
                { value: 'cash',     label: 'Tunai' },
                { value: 'check',    label: 'Cek/Giro' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(opt.value)
                    setErrors(prev => ({ ...prev, payment_method: '', bank_account_id: '' }))
                  }}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === opt.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.payment_method && <p className="text-xs text-red-500 mt-2">{errors.payment_method}</p>}

            {paymentMethod === 'transfer' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Rekening Tujuan <span className="text-red-500">*</span>
                </label>
                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Belum ada rekening bank. Tambahkan di <strong>Pengaturan → Profil Perusahaan</strong>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bankAccounts.map(bank => (
                      <label
                        key={bank.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                          bankAccountId === bank.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bank_account"
                          checked={bankAccountId === bank.id}
                          onChange={() => { setBankAccountId(bank.id); setErrors(prev => ({ ...prev, bank_account_id: '' })) }}
                          className="accent-green-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bank.bank_name}</div>
                          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {bank.account_number} · a.n. {bank.account_holder}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.bank_account_id && <p className="text-xs text-red-500 mt-2">{errors.bank_account_id}</p>}
              </div>
            )}
          </div>

          {/* Section E: Down Payment (Uang Muka) */}
          <DownPaymentForm
            totalAmount={nettoAmount}
            initialValue={downPayment}
            onChange={setDownPayment}
            defaultDate={header.invoice_date}
            paymentMethod={paymentMethod}
          />
          {errors.down_payment && <p className="text-xs text-red-500 -mt-2">{errors.down_payment}</p>}
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <div className="bg-white rounded-xl border p-5 sticky top-20" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Pratinjau Invoice</h3>
            <div className="text-xs space-y-1.5 font-mono border rounded-lg p-4" style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--border-card)', backgroundColor: '#FAFAFA' }}>
              <div className="text-center font-bold text-gray-700 mb-2">── PT. PELANGI NUANSA JAYA ──</div>
              <div><span className="text-gray-400">Invoice # :</span> (auto)</div>
              <div><span className="text-gray-400">Kepada    :</span> {(scopeMode === 'project' ? selectedProject?.customer.name : selectedCustomer?.name) ?? '—'}</div>
              <div><span className="text-gray-400">Kontrak   :</span> {scopeMode === 'project' ? selectedProject?.contract_number ?? '—' : 'Tanpa proyek'}</div>
              <div><span className="text-gray-400">Tgl       :</span> {header.invoice_date}</div>
              <div><span className="text-gray-400">Jasa      :</span> {serviceLabel}</div>
              {isDeliveryLikeService && (
                <div><span className="text-gray-400">Harga     :</span> {deliveryPricingMode === 'item' ? 'Per Barang' : 'Per Pengiriman'}</div>
              )}
              <div><span className="text-gray-400">Jth Tempo :</span> {header.due_date}</div>
              <div className="border-t my-2" style={{ borderColor: 'var(--border-card)' }} />
              <div className="text-gray-500">{items.length} baris item</div>
              <div className="border-t my-2" style={{ borderColor: 'var(--border-card)' }} />
              <div><span className="text-gray-400">Sub Total :</span> {formatRupiah(invoiceSubtotalAmount)}</div>
              {taxEnabled && <div><span className="text-gray-400">PPN {taxPercent}%  :</span> + {formatRupiah(taxAmount)}</div>}
              {pphEnabled && <div style={{ color: '#DC2626' }}><span className="text-gray-400">PPh {pphPercent}%  :</span> − {formatRupiah(pphAmount)}</div>}
              <div className="font-bold"><span className="text-gray-400">NETTO     :</span> {formatRupiah(nettoAmount)}</div>
              {downPayment && downPayment.amount > 0 && (
                <>
                  <div style={{ color: '#15803D' }}><span className="text-gray-400">DP        :</span> − {formatRupiah(downPayment.amount)}</div>
                  <div className="font-bold"><span className="text-gray-400">SISA      :</span> {formatRupiah(Math.max(0, nettoAmount - downPayment.amount))}</div>
                </>
              )}
            </div>
          </div>

          {/* Customer info */}
          {(scopeMode === 'project' ? selectedProject?.customer : selectedCustomer) && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Info Customer</h3>
              {(() => {
                const customer = scopeMode === 'project' ? selectedProject?.customer : selectedCustomer
                if (!customer) return null
                return (
                  <>
                    <div className="text-sm font-semibold">{customer.name}</div>
                    {customer.address && <div className="text-xs text-gray-500 mt-0.5">{customer.address}</div>}
                    {customer.npwp && <div className="text-xs text-gray-500 mt-0.5">NPWP: {customer.npwp}</div>}
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: customer.is_pkp ? '#DCFCE7' : '#F3F4F6', color: customer.is_pkp ? '#166534' : '#6B7280' }}>
                      {customer.is_pkp ? 'PKP' : 'Non-PKP'}
                    </span>
                  </>
                )
              })()}
            </div>
          )}

          {/* SJ info */}
          {(selectedProject || selectedCustomer) && isDeliveryLikeService && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}>
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">SJ dengan scope yang sama bisa dilampirkan ke invoice setelah disimpan.</p>
                  <p className="text-xs text-blue-600 mt-1">Lampirkan SJ dilakukan setelah invoice dibuat.</p>
                </div>
              </div>
            </div>
          )}
          {(selectedProject || selectedCustomer) && !isDeliveryLikeService && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }}>
              <div className="flex items-start gap-2">
                <Info size={16} className="text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-orange-800">Invoice jasa penyewaan tidak memakai lampiran SJ.</p>
                  <p className="text-xs text-orange-600 mt-1">Periode pakai diambil dari tanggal periode pada rincian item.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--border-card)' }}>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
        <button
          onClick={handleSaveDraft}
          disabled={isSubmitting || isCheckingSj}
          className="px-4 py-2 rounded-xl border text-sm font-medium disabled:opacity-40"
          style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan sebagai Draft'}
        </button>
        <button
          onClick={handleSaveAndSend}
          disabled={isSubmitting || isCheckingSj}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan & Kirim ke Customer →'}
        </button>
      </div>
      <div className="h-20" /> {/* Spacer for sticky bar */}

      <ConfirmOverwriteSJModal
        open={sjGate?.mode === 'confirm'}
        sjNumber={sjGate?.sjNumber || ''}
        sjStatus={sjGate?.sjStatus}
        onConfirm={() => { const g = sjGate; setSjGate(null); if (g) doSubmit(g.send, true) }}
        onCancel={() => setSjGate(g => (g ? { ...g, mode: 'clear' } : null))}
      />
      <ClearManualSJPrompt
        open={sjGate?.mode === 'clear'}
        onClearAndSubmit={() => { const g = sjGate; setManualSjNumbers(''); setSjGate(null); if (g) doSubmit(g.send, false, true) }}
        onBack={() => setSjGate(null)}
      />
    </DashboardLayout>
  )
}
