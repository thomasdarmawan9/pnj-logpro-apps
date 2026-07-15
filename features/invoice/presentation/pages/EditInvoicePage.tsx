'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, ArrowLeft, Pencil, Truck, KeyRound, Wrench, ArrowRightLeft, Search, ChevronDown, Check } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { updateInvoice } from '@/store/slices/invoiceSlice'
import { fetchCustomers, fetchDrivers, fetchFleets } from '@/store/slices/masterSlice'
import { fetchBankAccounts } from '@/store/slices/settingsSlice'
import { useToast } from '@/components/toast/useToast'
import { DeliveryPricingMode, InvoiceStatus } from '../../domain/entities/Invoice'
import { validateUpdateInvoice } from '../../application/validators/InvoiceValidator'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'
import { getSettlementDate } from '../utils/settlementDate'
import useInvoiceDetail from '../hooks/useInvoiceDetail'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import InvoiceItemRow from '../components/InvoiceItemRow'
import DeliveryInvoiceItemsSection from '../components/DeliveryInvoiceItemsSection'
import DeliveryOperationsSection from '../components/DeliveryOperationsSection'
import DeliveryPricingSection, { type AdditionalDeliveryCharge } from '../components/DeliveryPricingSection'
import InvoiceTaxCalculator from '../components/InvoiceTaxCalculator'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'
import InvoiceLampiranUploadZone from '../components/InvoiceLampiranUploadZone'
import DownPaymentForm from '../components/DownPaymentForm'
import InvoiceItemsTable from '../components/InvoiceItemsTable'
import ConfirmOverwriteSJModal from '../components/modals/ConfirmOverwriteSJModal'
import ClearManualSJPrompt from '../components/modals/ClearManualSJPrompt'
import { suratJalanRepository } from '../../../surat-jalan/infrastructure/repositories/MockSuratJalanRepository'
import type { SjLookupResult } from '../../../surat-jalan/infrastructure/repositories/ISuratJalanRepository'
import type { CreateDownPaymentDto } from '../../application/dto/CreateInvoiceDto'

const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface Props { uuid: string }

export default function EditInvoicePage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)
  const { invoice, isLoading } = useInvoiceDetail(uuid)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [settlementDate, setSettlementDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taxPercent, setTaxPercent] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [pphPercent, setPphPercent] = useState(2)
  const [pphEnabled, setPphEnabled] = useState(false)
  const [insuranceEnabled, setInsuranceEnabled] = useState(false)
  const [insuranceAmount, setInsuranceAmount] = useState(0)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [lampiranPaths, setLampiranPaths] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'check'>('transfer')
  const [bankAccountId, setBankAccountId] = useState<number | null>(null)
  const [downPayment, setDownPayment] = useState<CreateDownPaymentDto | null>(null)
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
  const [deliveryDate, setDeliveryDate] = useState('')
  const [manualSjNumbers, setManualSjNumbers] = useState('')
  const [sjGate, setSjGate] = useState<{ mode: 'confirm' | 'clear'; sjNumber: string; sjStatus?: string; dto: Record<string, unknown> } | null>(null)
  const [isCheckingSj, setIsCheckingSj] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const bankAccounts = useSelector((state: RootState) => state.settings.bankAccounts).filter(b => b.is_active)
  const fleets = useSelector((state: RootState) => state.master.fleets)
  const drivers = useSelector((state: RootState) => state.master.drivers)
  const customers = useSelector((state: RootState) => state.master.customers)
  // Ganti customer — hanya untuk invoice tanpa proyek (customer invoice berproyek
  // terikat ke proyek). customerId null = belum diubah (pakai customer invoice).
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const customerPickerRef = useRef<HTMLDivElement>(null)
  // Draft bisa edit penuh. Invoice Terbit bisa edit metode pembayaran + DP.
  // Outstanding/paid hanya boleh edit DP. Void tidak bisa di-edit.
  // Invoice VOID: hanya tanggal invoice yang bisa diubah (field lain terkunci).
  const isDraft = invoice?.status === InvoiceStatus.DRAFT
  const isVoid = invoice?.status === InvoiceStatus.VOID
  const isPaid = invoice?.status === InvoiceStatus.PAID
  const fullEditable = isDraft
  const canEditPaymentSetup = isDraft || invoice?.status === InvoiceStatus.SENT
  const canEditItems = isDraft || invoice?.status === InvoiceStatus.SENT
  const canEditTaxes = !isVoid

  const { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, calculateTax, totalAmount } = useInvoiceItems()

  useEffect(() => {
    if (invoice) {
      setInvoiceDate(invoice.invoice_date)
      setDueDate(invoice.due_date)
      setSettlementDate(getSettlementDate(invoice) ?? '')
      setNotes(invoice.notes ?? '')
      setPaymentMethod(invoice.payment_method ?? 'transfer')
      setBankAccountId(invoice.bank_account_id ?? null)
      setLampiranPaths(invoice.lampiran_paths ?? [])
      setRouteOrigin(invoice.origin ?? '')
      setRouteDestination(invoice.destination ?? '')
      setCargoDescription(invoice.cargo_description ?? '')
      setDeliveryDate(invoice.delivery_date ?? '')
      setManualSjNumbers(invoice.manual_sj_numbers ?? '')
      setCustomerId(invoice.customer_id ?? invoice.customer.id ?? null)
      setCustomerSearch(invoice.customer.name)
      setTaxPercent(invoice.tax_percent)
      setTaxEnabled(invoice.tax_percent > 0)
      setPphPercent(invoice.pph_percent > 0 ? invoice.pph_percent : 2)
      setPphEnabled(invoice.pph_percent > 0)
      setInsuranceAmount(invoice.insurance_amount > 0 ? invoice.insurance_amount : 0)
      setInsuranceEnabled(invoice.insurance_amount > 0)
      const nextDeliveryPricingMode = invoice.delivery_pricing_mode ?? 'shipment'
      setDeliveryPricingMode(nextDeliveryPricingMode)

      // Pre-fill DP form dengan DP existing kalau ada.
      if (invoice.down_payment) {
        setDownPayment({
          payment_date: invoice.down_payment.payment_date,
          amount:       invoice.down_payment.amount,
          method:       invoice.down_payment.method,
          notes:        invoice.down_payment.notes,
        })
      } else {
        setDownPayment(null)
      }

      const isDeliveryAdditionalCharge = (item: typeof invoice.items[number]) =>
        item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
        Number(item.unit_price || 0) > 0 &&
        (item.cargo_qty === null || item.cargo_qty === undefined)
      const effectiveInvoiceServiceType = resolveEffectiveInvoiceServiceType(invoice.service_type, invoice.custom_service_name)
      const isDeliveryLikeInvoice = effectiveInvoiceServiceType !== 'rental'
      const additionalChargeItems = isDeliveryLikeInvoice
        ? invoice.items.filter(isDeliveryAdditionalCharge)
        : []
      const editableItems = isDeliveryLikeInvoice
        ? invoice.items.filter(item => !isDeliveryAdditionalCharge(item))
        : invoice.items
      const operationsItem = editableItems.find(item => item.fleet_id || item.fleet_label || item.driver_id || item.driver_name_manual)
      setDeliveryFleetId(operationsItem?.fleet_id ?? null)
      setDeliveryFleetLabel(['Pengiriman', 'Lainnya', invoice.custom_service_name].includes(operationsItem?.fleet_label ?? '') ? '' : operationsItem?.fleet_label ?? '')
      setDeliveryDriverId(operationsItem?.driver_id ?? null)
      setDeliveryDriverNameManual(operationsItem?.driver_name_manual ?? '')
      setAdditionalCharges(additionalChargeItems.map(item => ({
        uuid: item.uuid,
        name: item.description || '',
        amount: Number(item.subtotal || item.unit_price || 0),
      })))

      const isShipmentDelivery = isDeliveryLikeInvoice && nextDeliveryPricingMode === 'shipment'
      const pricedItem = editableItems.find(item => Number(item.subtotal || 0) > 0 || Number(item.unit_price || 0) > 0) ?? editableItems[0]
      const pricingQty = isShipmentDelivery ? Number(pricedItem?.qty || 1) : null
      const additionalChargesSubtotal = additionalChargeItems.reduce((sum, item) => sum + Number(item.subtotal || item.unit_price || 0), 0)
      const pricingSubtotal = isShipmentDelivery
        ? Math.max(0, Number(invoice.subtotal_amount || pricedItem?.subtotal || 0) - additionalChargesSubtotal)
        : null
      if (isShipmentDelivery) {
        const nextQty = pricingQty || 1
        setDeliveryShipmentQty(nextQty)
        setDeliveryShipmentUnit(pricedItem?.unit || 'pengiriman')
        setDeliveryShipmentUnitPrice(pricingSubtotal !== null
          ? Math.round(pricingSubtotal / Math.max(nextQty, 1))
          : Number(pricedItem?.unit_price || 0))
      }
      const isDeliveryItemPricing = isDeliveryLikeInvoice && nextDeliveryPricingMode === 'item'
      resetItems(editableItems.map((item, idx) => {
        const isDeliveryPricingRow = isShipmentDelivery && idx === 0
        const nextQty = isDeliveryItemPricing
          ? Number(item.qty ?? item.cargo_qty ?? 0)
          : isDeliveryPricingRow ? pricingQty || 1 : item.qty
        const nextUnitPrice = isDeliveryPricingRow && pricingSubtotal !== null
          ? Math.round(pricingSubtotal / Math.max(nextQty, 1))
          : item.unit_price

        return {
          uuid: item.uuid,
          fleet_id: item.fleet_id ?? null,
          fleet: item.fleet ?? null,
          driver_id: item.driver_id ?? null,
          driver: item.driver ?? null,
          driver_name_manual: item.driver_name_manual ?? '',
          fleet_label: item.fleet_label,
          description: item.description,
          period_start: item.period_start,
          period_end: item.period_end,
          rental_duration_years: item.rental_duration_years ?? 0,
          rental_duration_months: item.rental_duration_months ?? 0,
          rental_duration_days: item.rental_duration_days ?? 0,
          rental_duration_hours: item.rental_duration_hours ?? 0,
          qty: nextQty,
          unit: isDeliveryItemPricing
            ? item.unit ?? item.cargo_unit
            : isDeliveryPricingRow ? pricedItem?.unit || item.unit : item.unit,
          cargo_qty: item.cargo_qty ?? null,
          cargo_unit: item.cargo_unit ?? null,
          cargo_weight: item.cargo_weight ?? null,
          cargo_volume: item.cargo_volume ?? null,
          cargo_notes: item.cargo_notes ?? null,
          unit_price: isDeliveryLikeInvoice
            ? isDeliveryItemPricing
              ? item.unit_price
              : isDeliveryPricingRow ? nextUnitPrice : 0
            : item.unit_price,
          subtotal: isDeliveryLikeInvoice
            ? isDeliveryItemPricing
              ? Math.round(nextQty * Number(item.unit_price || 0))
              : isDeliveryPricingRow ? pricingSubtotal || 0 : 0
            : item.subtotal,
          sort_order: item.sort_order,
          source_sj_id: item.source_sj_id,
        }
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice])

  useEffect(() => { dispatch(fetchBankAccounts()) }, [dispatch])
  useEffect(() => {
    if (!fleets.length) dispatch(fetchFleets())
    if (!drivers.length) dispatch(fetchDrivers())
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, fleets.length, drivers.length, customers.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!customerPickerRef.current?.contains(event.target as Node)) {
        setCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (role !== null && role !== 'super_admin' && role !== 'admin_finance') {
      router.replace('/surat-jalan')
    }
  }, [role, router])

  const effectiveInvoiceServiceType = resolveEffectiveInvoiceServiceType(invoice?.service_type, invoice?.custom_service_name)
  const isDeliveryLikeInvoice = effectiveInvoiceServiceType !== 'rental'
  // Customer bisa diganti hanya untuk invoice tanpa proyek (semua status).
  const canEditCustomer = Boolean(invoice) && !invoice?.project
  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === customerId) ?? null,
    [customers, customerId],
  )
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q || (selectedCustomer && customerSearch === selectedCustomer.name)) return customers
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(q) ||
      (customer.npwp || '').toLowerCase().includes(q) ||
      (customer.address || '').toLowerCase().includes(q)
    )
  }, [customers, customerSearch, selectedCustomer])
  const selectCustomer = (id: number) => {
    const customer = customers.find(c => c.id === id) || null
    setCustomerId(customer?.id ?? null)
    setCustomerSearch(customer?.name ?? '')
    setCustomerDropdownOpen(false)
  }
  const serviceLabel = effectiveInvoiceServiceType === 'rental'
    ? 'Jasa Penyewaan'
    : invoice?.service_type === 'other'
      ? invoice.custom_service_name || 'Jasa Lainnya'
      : 'Jasa Pengiriman'
  const serviceIcon = effectiveInvoiceServiceType === 'rental' ? KeyRound : invoice?.service_type === 'other' ? Wrench : Truck
  const ServiceIcon = serviceIcon
  const defaultDeliveryFleetLabel = invoice?.service_type === 'other' ? invoice.custom_service_name || 'Lainnya' : 'Pengiriman'
  const deliveryShipmentSubtotal = Math.round(Number(deliveryShipmentQty || 0) * Number(deliveryShipmentUnitPrice || 0))
  const deliverySubtotalAmount = isDeliveryLikeInvoice
    ? deliveryPricingMode === 'item'
      ? subtotalAmount
      : deliveryShipmentSubtotal
    : subtotalAmount
  const additionalChargesTotal = isDeliveryLikeInvoice
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
  // Dihitung langsung dari invoice (bukan via effect) supaya DownPaymentForm
  // sudah mendapat nilai DP yang benar di render pertama — mencegah glitch
  // "Tidak ada DP" yang sempat muncul lalu berubah jadi "Aktif".
  const dpInitialValue = useMemo<CreateDownPaymentDto | null>(() => {
    if (!invoice?.down_payment) return null
    return {
      payment_date: invoice.down_payment.payment_date,
      amount:       invoice.down_payment.amount,
      method:       invoice.down_payment.method,
      notes:        invoice.down_payment.notes,
    }
  }, [invoice?.down_payment])
  const displayedDownPayment = downPayment ?? dpInitialValue
  const today = new Date().toISOString().split('T')[0]
  const isDueDatePast = dueDate < today

  const addAdditionalCharge = () => {
    setAdditionalCharges(prev => [...prev, { uuid: crypto.randomUUID(), name: '', amount: 0 }])
  }

  const updateAdditionalCharge = (chargeUuid: string, field: keyof Omit<AdditionalDeliveryCharge, 'uuid'>, value: string | number) => {
    setAdditionalCharges(prev => prev.map(charge => (
      charge.uuid === chargeUuid ? { ...charge, [field]: value } : charge
    )))
  }

  const removeAdditionalCharge = (chargeUuid: string) => {
    setAdditionalCharges(prev => prev.filter(charge => charge.uuid !== chargeUuid))
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

  const updateDeliveryItem = (itemUuid: string, field: string, value: unknown) => {
    if (deliveryPricingMode === 'item' && (field === 'cargo_qty' || field === 'cargo_unit')) {
      resetItems(items.map(item => {
        if (item.uuid !== itemUuid) return item
        return syncItemPricingFromCargo({ ...item, [field]: value })
      }))
      return
    }
    updateItem(itemUuid, field, value)
  }

  const updateDeliveryPrice = (itemUuid: string, field: string, value: unknown) => {
    if (deliveryPricingMode === 'item' && field === 'unit_price') {
      resetItems(items.map(item => {
        if (item.uuid !== itemUuid) return item
        return syncItemPricingFromCargo({ ...item, unit_price: Number(value || 0) })
      }))
      return
    }
    updateItem(itemUuid, field, value)
  }

  const toggleInsurance = (enabled: boolean) => {
    setInsuranceEnabled(enabled)
    if (!enabled) setInsuranceAmount(0)
  }

  const commitUpdate = async (finalDto: Record<string, unknown>) => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const action = await dispatch(updateInvoice({ uuid, dto: finalDto as Parameters<typeof validateUpdateInvoice>[0] }))
      if (updateInvoice.fulfilled.match(action)) {
        pushToast({ title: 'Invoice Disimpan', description: `Invoice #${invoice?.invoice_number} berhasil diperbarui.`, variant: 'success' })
        router.push(`/invoice/${uuid}`)
      } else if (updateInvoice.rejected.match(action)) {
        pushToast({ title: 'Gagal Menyimpan', description: action.payload as string ?? 'Terjadi kesalahan. Coba lagi.', variant: 'error' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const submitWithSjGate = async (dto: Record<string, unknown>) => {
    if (isCheckingSj) return
    setIsCheckingSj(true)
    try {
      const raw = typeof dto.manual_sj_numbers === 'string' ? dto.manual_sj_numbers.trim() : ''
      const manualMode = 'manual_sj_numbers' in dto && raw.length > 0
      // Toleransi data lama multi-nomor: lewati gate; backend skip auto-create.
      if (!manualMode || raw.includes(',')) { await commitUpdate(dto); return }

      let lookup: SjLookupResult | null
      try {
        lookup = await suratJalanRepository.getBySjNumber(raw)
      } catch {
        pushToast({ title: 'Gagal cek nomor SJ', description: 'Tidak bisa memverifikasi nomor SJ. Coba lagi.', variant: 'error' })
        return
      }

      const currentInvoiceId = invoice?.id ?? null
      if (lookup && lookup.invoice_id && Number(lookup.invoice_id) !== Number(currentInvoiceId)) {
        pushToast({ title: 'Nomor SJ dipakai invoice lain', description: `SJ ${raw} sudah tertaut invoice ${lookup.invoice_number || 'lain'}. Ganti nomor SJ.`, variant: 'error' })
        return
      }
      if (lookup && Number(lookup.invoice_id || 0) !== Number(currentInvoiceId)) {
        // SJ ada & bukan milik invoice ini → konfirmasi timpa.
        setSjGate({ mode: 'confirm', sjNumber: raw, sjStatus: lookup.status, dto })
        return
      }
      // Tidak ada, atau SJ ini sudah milik invoice yang diedit → lanjut.
      await commitUpdate({ ...dto, overwrite_sj_confirmed: false })
    } finally {
      setIsCheckingSj(false)
    }
  }

  const handleSave = async () => {
    // Tanggal invoice (tanggal pembuatan) wajib diisi di semua status.
    if (!invoiceDate) {
      const message = 'Tanggal invoice wajib diisi'
      setErrors({ invoice_date: message })
      pushToast({ title: 'Tanggal tidak valid', description: message, variant: 'error' })
      return
    }

    // Konsistensi tanggal: invoice tidak boleh lebih baru dari jatuh tempo
    // (format YYYY-MM-DD, aman dibandingkan sebagai string). Saat jatuh tempo
    // masih bisa diedit (draft/terbit) arahkan error ke field jatuh tempo,
    // selain itu arahkan ke field tanggal invoice yang sedang diubah.
    if (invoiceDate && dueDate && dueDate < invoiceDate) {
      const message = canEditPaymentSetup
        ? 'Tanggal jatuh tempo tidak boleh sebelum tanggal invoice'
        : 'Tanggal invoice tidak boleh setelah tanggal jatuh tempo'
      setErrors(canEditPaymentSetup ? { due_date: message } : { invoice_date: message })
      pushToast({ title: 'Tanggal tidak valid', description: message, variant: 'error' })
      return
    }

    // Tanggal pelunasan (hanya untuk invoice lunas): wajib terisi & tidak boleh
    // sebelum tanggal invoice.
    if (isPaid) {
      if (!settlementDate) {
        const message = 'Tanggal pelunasan wajib diisi'
        setErrors({ settlement_date: message })
        pushToast({ title: 'Tanggal tidak valid', description: message, variant: 'error' })
        return
      }
      if (settlementDate < invoiceDate) {
        const message = 'Tanggal pelunasan tidak boleh sebelum tanggal invoice'
        setErrors({ settlement_date: message })
        pushToast({ title: 'Tanggal tidak valid', description: message, variant: 'error' })
        return
      }
    }

    // Ganti customer (hanya invoice tanpa proyek, semua status). customerPatch
    // hanya dikirim bila customer benar-benar berubah dari nilai awal invoice.
    if (canEditCustomer && !customerId) {
      const message = 'Pilih customer'
      setErrors({ customer_id: message })
      pushToast({ title: 'Customer belum dipilih', description: message, variant: 'error' })
      return
    }
    const currentCustomerId = invoice?.customer_id ?? invoice?.customer.id ?? null
    const customerPatch: { customer_id?: number } =
      canEditCustomer && customerId && customerId !== currentCustomerId
        ? { customer_id: customerId }
        : {}

    // Invoice VOID: hanya tanggal invoice (dan opsional ganti customer) yang diizinkan.
    // Kirim payload minimal supaya backend tidak menolak (dan tidak menyentuh DP/item).
    if (isVoid) {
      const voidDto = { invoice_date: invoiceDate, ...customerPatch }
      await commitUpdate(voidDto)
      return
    }

    // DP payload — selalu disertakan (kalau berubah dari current).
    // null = clear DP, object = upsert.
    const dpPayload = downPayment === null ? null : { ...downPayment }

    if (dpPayload) {
      const nextErrors: Record<string, string> = {}
      if (!dpPayload.payment_date) nextErrors.down_payment = 'Tanggal DP wajib diisi'
      if (dpPayload.amount <= 0) nextErrors.down_payment = 'Nominal DP harus lebih dari 0'
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        pushToast({ title: 'DP belum valid', description: nextErrors.down_payment, variant: 'error' })
        return
      }
    }

    const baseItemPayload = items.map((item, idx) => {
      const isDelivery = isDeliveryLikeInvoice
      const isPricingRow = !isDelivery || deliveryPricingMode === 'item' || idx === 0
      return {
        uuid: item.uuid,
        source_sj_id: item.source_sj_id ?? null,
        fleet_id: isDelivery ? deliveryFleetId : item.fleet_id ?? null,
        driver_id: isDelivery ? deliveryDriverId : item.driver_id ?? null,
        driver_name_manual: isDelivery ? deliveryDriverNameManual || null : item.driver_name_manual || null,
        fleet_label: isDelivery
          ? deliveryFleetLabel || defaultDeliveryFleetLabel
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
        cargo_qty: item.cargo_qty ?? null,
        cargo_unit: item.cargo_unit ?? null,
        cargo_weight: item.cargo_weight ?? null,
        cargo_volume: item.cargo_volume ?? null,
        cargo_notes: item.cargo_notes ?? null,
        unit_price: isDelivery && deliveryPricingMode === 'shipment' && idx === 0
          ? deliveryShipmentUnitPrice
          : isPricingRow ? item.unit_price : 0,
        sort_order: idx,
      }
    })
    const billingPayload = isDeliveryLikeInvoice && deliveryPricingMode === 'shipment' && baseItemPayload.length === 0 && deliveryShipmentSubtotal > 0
      ? [{
          uuid: null,
          source_sj_id: null,
          fleet_id: deliveryFleetId,
          driver_id: deliveryDriverId,
          driver_name_manual: deliveryDriverNameManual || null,
          fleet_label: deliveryFleetLabel || defaultDeliveryFleetLabel,
          description: invoice?.service_type === 'other' ? invoice.custom_service_name || 'Jasa Lainnya' : 'Harga Pengiriman',
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
    const chargePayload = isDeliveryLikeInvoice
      ? additionalCharges
        .filter(charge => charge.name.trim() && Number(charge.amount || 0) > 0)
        .map((charge, idx) => ({
          uuid: charge.uuid,
          source_sj_id: null,
          fleet_id: null,
          driver_id: null,
          driver_name_manual: null,
          fleet_label: DELIVERY_ADDITIONAL_CHARGE_LABEL,
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
          sort_order: baseItemPayload.length + billingPayload.length + idx,
        }))
      : []
    const itemPayload = [...baseItemPayload, ...billingPayload, ...chargePayload]

    const nextErrors: Record<string, string> = {}
    if (isDeliveryLikeInvoice) {
      additionalCharges.forEach((charge, idx) => {
        const hasName = Boolean(charge.name.trim())
        const hasAmount = Number(charge.amount || 0) > 0
        if (hasName || hasAmount) {
          if (!hasName) nextErrors[`additional_charges.${idx}.name`] = 'Nama pembiayaan wajib diisi'
          if (!hasAmount) nextErrors[`additional_charges.${idx}.amount`] = 'Nominal harus lebih dari 0'
        }
      })
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      pushToast({ title: 'Pembiayaan tambahan belum valid', description: Object.values(nextErrors)[0], variant: 'error' })
      return
    }

    let dto: Record<string, unknown>
    if (fullEditable) {
      dto = {
        invoice_date: invoiceDate,
        due_date: dueDate,
        notes: notes || null,
        payment_method: paymentMethod,
        bank_account_id: paymentMethod === 'transfer' ? bankAccountId : null,
        delivery_pricing_mode: isDeliveryLikeInvoice ? deliveryPricingMode : 'shipment',
        tax_percent: taxEnabled ? taxPercent : 0,
        pph_percent: pphEnabled ? pphPercent : 0,
        insurance_amount: insuranceEnabled ? insuranceAmount : 0,
        origin: isDeliveryLikeInvoice ? routeOrigin || null : null,
        destination: isDeliveryLikeInvoice ? routeDestination || null : null,
        cargo_description: isDeliveryLikeInvoice ? cargoDescription || null : null,
        delivery_date: isDeliveryLikeInvoice ? deliveryDate || null : null,
        manual_sj_numbers: isDeliveryLikeInvoice ? manualSjNumbers.trim() || null : null,
        lampiran_paths: lampiranPaths.length > 0 ? lampiranPaths : null,
        items: itemPayload,
        down_payment: dpPayload,
        ...customerPatch,
      }
      const result = validateUpdateInvoice(dto as Parameters<typeof validateUpdateInvoice>[0], invoice?.service_type, invoice?.custom_service_name)
      setErrors(result.errors)
      if (!result.valid) {
        pushToast({ title: 'Data belum lengkap', description: Object.values(result.errors)[0], variant: 'error' })
        return
      }
    } else {
      dto = canEditPaymentSetup
        ? {
            invoice_date: invoiceDate,
            due_date: dueDate,
            payment_method: paymentMethod,
            bank_account_id: paymentMethod === 'transfer' ? bankAccountId : null,
            origin: isDeliveryLikeInvoice ? routeOrigin || null : null,
            destination: isDeliveryLikeInvoice ? routeDestination || null : null,
            cargo_description: isDeliveryLikeInvoice ? cargoDescription || null : null,
            delivery_date: isDeliveryLikeInvoice ? deliveryDate || null : null,
            manual_sj_numbers: isDeliveryLikeInvoice ? manualSjNumbers.trim() || null : null,
            ...(canEditItems && isDeliveryLikeInvoice ? { delivery_pricing_mode: deliveryPricingMode } : {}),
            ...(canEditItems ? { items: itemPayload } : {}),
            tax_percent: taxEnabled ? taxPercent : 0,
            pph_percent: pphEnabled ? pphPercent : 0,
            insurance_amount: insuranceEnabled ? insuranceAmount : 0,
            down_payment: dpPayload,
            ...customerPatch,
          }
        : {
            invoice_date: invoiceDate,
            tax_percent: taxEnabled ? taxPercent : 0,
            pph_percent: pphEnabled ? pphPercent : 0,
            down_payment: dpPayload,
            ...(isPaid ? { settlement_date: settlementDate } : {}),
            ...customerPatch,
          }

      const result = validateUpdateInvoice(dto as Parameters<typeof validateUpdateInvoice>[0], invoice?.service_type, invoice?.custom_service_name)
      setErrors(result.errors)
      if (!result.valid) {
        pushToast({ title: 'Data belum lengkap', description: Object.values(result.errors)[0], variant: 'error' })
        return
      }
    }

    await submitWithSjGate(dto)
  }

  if (role === null || (role !== 'super_admin' && role !== 'admin_finance')) return null

  if (isLoading || !invoice) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div className="text-xs text-gray-500">Dashboard / Invoice / #{invoice?.invoice_number} / Edit</div>
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
      </div>

      {/* Edit banner */}
      <div className="mb-4 rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: fullEditable ? '#FDE68A' : '#BAE6FD', backgroundColor: fullEditable ? '#FFFBEB' : '#F0F9FF' }}>
        <Pencil size={16} style={{ color: fullEditable ? '#D97706' : '#0369A1' }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: fullEditable ? '#92400E' : '#0C4A6E' }}>
            {isVoid
              ? `Mode Ubah Tanggal Invoice (Void) — Invoice #${invoice?.invoice_number}`
              : fullEditable
                ? `Mode Edit Penuh — Invoice #${invoice?.invoice_number}`
                : canEditPaymentSetup
                  ? `Mode Edit Invoice Terbit — Invoice #${invoice?.invoice_number}`
                  : `Mode Edit DP & Pajak — Invoice #${invoice?.invoice_number}`
            }
          </div>
          <div className="text-xs" style={{ color: fullEditable ? '#B45309' : '#075985' }}>
            {isVoid
              ? 'Invoice sudah void. Hanya tanggal invoice yang bisa diubah; field lain terkunci.'
              : fullEditable
                ? 'Anda sedang mengedit invoice draft. Perubahan belum disimpan.'
                : canEditPaymentSetup
                  ? 'Invoice terbit bisa mengubah tanggal jatuh tempo, metode pembayaran, DP, rincian item, serta PPN/PPh/Asuransi.'
                  : 'Invoice sudah berjalan. Tanggal invoice, DP/Uang Muka, PPN, dan PPh bisa diedit. Item tetap terkunci.'
            }
          </div>
        </div>
        <InvoiceStatusBadge status={invoice?.status ?? 'draft'} size="sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Header (partial edit) */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Header Invoice</h2>
            <div className="space-y-4">
              {/* Readonly */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Proyek</label>
                <div className="form-input bg-gray-50 text-gray-500">{invoice?.project ? `${invoice.project.code} — ${invoice.project.name}` : 'Tanpa proyek'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Customer{canEditCustomer ? ' *' : ''}</label>
                {canEditCustomer ? (
                  <>
                    <div ref={customerPickerRef} className="relative">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          <Search size={15} />
                        </span>
                        <input
                          className="form-input w-full"
                          style={{ paddingLeft: 42, paddingRight: 40 }}
                          value={customerSearch}
                          placeholder="Ketik nama customer..."
                          onFocus={() => setCustomerDropdownOpen(true)}
                          onChange={event => {
                            setCustomerSearch(event.target.value)
                            setCustomerId(null)
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
                              const selected = customerId === customer.id
                              return (
                                <button
                                  key={customer.uuid}
                                  type="button"
                                  onClick={() => selectCustomer(customer.id)}
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
                    {errors.customer_id && <p className="text-xs text-red-500 mt-1">{errors.customer_id}</p>}
                    {invoice?.attached_sj && invoice.attached_sj.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">Ada {invoice.attached_sj.length} SJ terlampir — customer pada SJ tersebut ikut berubah bila customer invoice diganti.</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="form-input bg-gray-50 text-gray-500">{invoice?.customer.name}</div>
                    {invoice?.project && <p className="text-xs text-gray-400 mt-1">Customer mengikuti proyek dan tidak dapat diganti di sini.</p>}
                  </>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">No. Invoice</label>
                <div className="form-input bg-gray-50 text-gray-500 italic font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{invoice?.invoice_number}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Jenis Jasa</label>
                <div className="form-input bg-gray-50 text-gray-600 flex items-center gap-2">
                  <ServiceIcon size={15} />
                  <span>{serviceLabel}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">Jenis jasa tidak dapat diedit. Jika salah pilih, void invoice lalu buat invoice baru.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Invoice *</label>
                <input
                  type="date"
                  className="form-input w-full"
                  value={invoiceDate}
                  max={dueDate || undefined}
                  onChange={e => setInvoiceDate(e.target.value)}
                />
                {errors.invoice_date && <p className="text-xs text-red-500 mt-1">{errors.invoice_date}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Tanggal pembuatan invoice. Otomatis terisi saat invoice dibuat, dan bisa diubah kapan saja di semua status{isVoid ? ' (termasuk void)' : ''}.
                </p>
              </div>
              {isDeliveryLikeInvoice && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Pengiriman</label>
                  <input
                    type="date"
                    className="form-input w-full disabled:bg-gray-50 disabled:text-gray-500"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    disabled={!canEditItems}
                  />
                  <p className="text-xs text-gray-400 mt-1">Opsional. Tampil di PDF invoice di atas Nomor SJ.</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Jatuh Tempo *</label>
                <input type="date" className="form-input w-full disabled:bg-gray-50 disabled:text-gray-500" value={dueDate} min={invoiceDate || invoice?.invoice_date} onChange={e => setDueDate(e.target.value)} disabled={!canEditPaymentSetup} />
                {errors.due_date && <p className="text-xs text-red-500 mt-1">{errors.due_date}</p>}
                {isDueDatePast && <p className="text-xs text-amber-600 mt-1">⚠ Tanggal jatuh tempo sudah terlewat</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Pelunasan{isPaid ? ' *' : ''}</label>
                <input
                  type="date"
                  className="form-input w-full disabled:bg-gray-50 disabled:text-gray-500"
                  value={settlementDate}
                  min={invoiceDate || invoice?.invoice_date}
                  onChange={e => setSettlementDate(e.target.value)}
                  disabled={!isPaid}
                />
                {errors.settlement_date && <p className="text-xs text-red-500 mt-1">{errors.settlement_date}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {isPaid
                    ? 'Tanggal invoice dinyatakan lunas (tanggal pembayaran pelunas). Mengubahnya akan memperbarui tanggal pembayaran terakhir.'
                    : 'Terisi otomatis saat invoice lunas.'}
                </p>
              </div>
              {isDeliveryLikeInvoice && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nomor SJ</label>
                  <input
                    type="text"
                    className="form-input w-full disabled:bg-gray-50 disabled:text-gray-500"
                    value={manualSjNumbers}
                    onChange={event => setManualSjNumbers(event.target.value)}
                    placeholder="Contoh: SJ-2026-07-001"
                    disabled={!canEditItems}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Satu nomor SJ → otomatis dibuat/diperbarui &amp; terlampir saat disimpan. Nilai lama berisi beberapa nomor tidak diproses otomatis.
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Catatan ke Customer</label>
                <textarea className="form-input w-full text-sm disabled:bg-gray-50 disabled:text-gray-500" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan..." disabled={!fullEditable} />
              </div>
            </div>
          </div>

          {/* Items */}
          {canEditItems && (isDeliveryLikeInvoice ? (
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
                disabled={!canEditItems}
              />
              <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
                <div className="text-sm font-semibold mb-4">Rute & Muatan</div>
                <label className="text-xs font-medium" style={{ color: '#374151' }}>
                  Lokasi Asal
                  <input
                    className="form-input w-full mt-1 disabled:bg-gray-50 disabled:text-gray-500"
                    value={routeOrigin}
                    onChange={event => setRouteOrigin(event.target.value)}
                    placeholder="contoh: Gudang PNJ, Jl. Arteri Supadio Pontianak"
                    disabled={!canEditItems}
                  />
                </label>

                <div className="flex items-end gap-3 mt-4">
                  <label className="text-xs font-medium flex-1" style={{ color: '#374151' }}>
                    Lokasi Tujuan
                    <input
                      className="form-input w-full mt-1 disabled:bg-gray-50 disabled:text-gray-500"
                      value={routeDestination}
                      onChange={event => setRouteDestination(event.target.value)}
                      placeholder="contoh: Lokasi PT. ATP BIO, Kubu Raya"
                      disabled={!canEditItems}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prevOrigin = routeOrigin
                      setRouteOrigin(routeDestination)
                      setRouteDestination(prevOrigin)
                    }}
                    className="px-3 py-2 rounded-lg border disabled:opacity-50"
                    style={{ borderColor: 'var(--border-card)' }}
                    title="Tukar asal-tujuan"
                    disabled={!canEditItems}
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>

                <label className="text-xs font-medium mt-4 block" style={{ color: '#374151' }}>
                  Deskripsi Muatan
                  <textarea
                    className="form-input w-full mt-1 disabled:bg-gray-50 disabled:text-gray-500"
                    rows={3}
                    value={cargoDescription}
                    onChange={event => setCargoDescription(event.target.value)}
                    placeholder="contoh: Kendaraan operasional untuk periode sewa"
                    disabled={!canEditItems}
                  />
                </label>
              </div>
              <DeliveryInvoiceItemsSection
                items={items}
                onAdd={addItem}
                onChange={updateDeliveryItem}
                onRemove={removeItem}
                errors={errors}
                readOnlyStructure={!canEditItems}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Rincian Item</h2>
                {canEditItems && (
                  <button onClick={addItem} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
                    <Plus size={14} />
                    Tambah Item
                  </button>
                )}
              </div>
              {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}
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
                      if (!canEditItems) return
                      if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) reorderItems(dragFrom, dragOver)
                      setDragFrom(null); setDragOver(null)
                    }}
                    serviceType={effectiveInvoiceServiceType}
                    readOnlyStructure={!canEditItems}
                    sourceLabel={item.source_sj_id ? 'Sumber SJ' : 'Manual Invoice'}
                  />
                ))}
              </div>
              {canEditItems && (
                <button onClick={addItem} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
                  <Plus size={16} />Tambah Item
                </button>
              )}
            </div>
          ))}
          {!canEditItems && isDeliveryLikeInvoice && (
            <div>
              <div className="rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm" style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--border-card)' }}>
                <div><span className="text-gray-500">Jenis Jasa</span><span className="ml-2">{serviceLabel}</span></div>
                <div><span className="text-gray-500">Mode Harga</span><span className="ml-2 font-medium">{deliveryPricingMode === 'item' ? 'Per Barang' : 'Per Pengiriman'}</span></div>
              </div>
              <InvoiceItemsTable
                items={invoice.items}
                serviceType={effectiveInvoiceServiceType}
                deliveryPricingMode={deliveryPricingMode}
                subtotalAmount={invoice.subtotal_amount}
                taxPercent={invoice.tax_percent}
                taxAmount={invoice.tax_amount}
                pphPercent={invoice.pph_percent}
                pphAmount={invoice.pph_amount}
                insuranceAmount={invoice.insurance_amount}
                totalAmount={invoice.total_amount}
              />
            </div>
          )}

          {/* Tax */}
          {canEditTaxes && <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Kalkulasi Pajak</h2>
            <InvoiceTaxCalculator
              subtotal={invoiceSubtotalAmount}
              taxPercent={taxPercent}
              taxEnabled={taxEnabled}
              pphPercent={pphPercent}
              pphEnabled={pphEnabled}
              isPkp={invoice?.customer.is_pkp}
              onToggleTax={e => { setTaxEnabled(e); setTaxPercent(e ? 1.1 : 0) }}
              onChangeTaxPercent={setTaxPercent}
              onTogglePph={e => { setPphEnabled(e); if (e && pphPercent === 0) setPphPercent(2) }}
              onChangePphPercent={setPphPercent}
              insuranceEnabled={insuranceEnabled}
              insuranceAmount={insuranceAmount}
              insuranceReadOnly={!canEditPaymentSetup}
              onToggleInsurance={toggleInsurance}
              onChangeInsuranceAmount={setInsuranceAmount}
            />
          </div>}

          {/* Metode Pembayaran */}
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
                  onClick={() => canEditPaymentSetup && setPaymentMethod(opt.value)}
                  disabled={!canEditPaymentSetup}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === opt.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'transfer' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Rekening Tujuan {canEditPaymentSetup && <span className="text-red-500">*</span>}
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                          fullEditable ? 'cursor-pointer' : 'cursor-default opacity-75'
                        } ${
                          bankAccountId === bank.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bank_account_edit"
                          checked={bankAccountId === bank.id}
                          onChange={() => canEditPaymentSetup && setBankAccountId(bank.id)}
                          disabled={!canEditPaymentSetup}
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
              </div>
            )}
          </div>

          {/* Down Payment (Uang Muka) — bisa diedit di semua status non-void.
              Untuk invoice void, DP dikunci (hanya tanggal invoice yang bisa diubah). */}
          {!isVoid && (
            <>
              <DownPaymentForm
                totalAmount={canEditPaymentSetup ? nettoAmount : (invoice?.total_amount ?? 0)}
                initialValue={dpInitialValue}
                onChange={setDownPayment}
                defaultDate={invoice?.invoice_date}
                paymentMethod={paymentMethod}
              />
              {errors.down_payment && <p className="text-xs text-red-500 -mt-2">{errors.down_payment}</p>}
            </>
          )}

          {/* Lampiran */}
          {fullEditable && <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-1">Lampiran Dokumen</h2>
            <p className="text-xs text-gray-500 mb-4">Upload foto atau file PDF sebagai dokumen pendukung invoice ini.</p>
            <InvoiceLampiranUploadZone
              value={lampiranPaths}
              onChange={setLampiranPaths}
              invoiceUuid={uuid}
            />
          </div>}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border p-5 sticky top-20" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Ringkasan</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Sub Total</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(invoiceSubtotalAmount)}</span></div>
              {taxEnabled && <div className="flex justify-between"><span className="text-gray-500">PPN {taxPercent}%</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>+ {formatRupiah(taxAmount)}</span></div>}
              {pphEnabled && <div className="flex justify-between"><span className="text-gray-500">PPh {pphPercent}%</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#DC2626' }}>− {formatRupiah(pphAmount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
                <span>NETTO</span>
                <span className="font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>{formatRupiah(nettoAmount)}</span>
              </div>
              {displayedDownPayment && displayedDownPayment.amount > 0 && (
                <>
                  <div className="flex justify-between text-green-700 border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
                    <span>DP Diterima</span>
                    <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>− {formatRupiah(displayedDownPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Sisa Tagihan</span>
                    <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(Math.max(0, (canEditPaymentSetup ? nettoAmount : (invoice?.total_amount ?? 0)) - displayedDownPayment.amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--border-card)' }}>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
        <button onClick={handleSave} disabled={isCheckingSj || isSaving} className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--green-primary)' }}>
          Simpan Perubahan
        </button>
      </div>
      <div className="h-20" />

      <ConfirmOverwriteSJModal
        open={sjGate?.mode === 'confirm'}
        sjNumber={sjGate?.sjNumber || ''}
        sjStatus={sjGate?.sjStatus}
        onConfirm={() => { const g = sjGate; setSjGate(null); if (g) commitUpdate({ ...g.dto, overwrite_sj_confirmed: true }) }}
        onCancel={() => setSjGate(g => (g ? { ...g, mode: 'clear' } : null))}
      />
      <ClearManualSJPrompt
        open={sjGate?.mode === 'clear'}
        onClearAndSubmit={() => { const g = sjGate; setManualSjNumbers(''); setSjGate(null); if (g) commitUpdate({ ...g.dto, auto_create_sj: false, manual_sj_numbers: null }) }}
        onBack={() => setSjGate(null)}
      />
    </DashboardLayout>
  )
}
