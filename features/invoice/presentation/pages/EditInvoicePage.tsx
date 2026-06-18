'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, ArrowLeft, Pencil, Truck, KeyRound, Wrench, ArrowRightLeft } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { updateInvoice } from '@/store/slices/invoiceSlice'
import { fetchDrivers, fetchFleets } from '@/store/slices/masterSlice'
import { fetchBankAccounts } from '@/store/slices/settingsSlice'
import { useToast } from '@/components/toast/useToast'
import { DeliveryPricingMode, InvoiceStatus } from '../../domain/entities/Invoice'
import { validateUpdateInvoice } from '../../application/validators/InvoiceValidator'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'
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
  const [dueDate, setDueDate] = useState('')
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
  const bankAccounts = useSelector((state: RootState) => state.settings.bankAccounts).filter(b => b.is_active)
  const fleets = useSelector((state: RootState) => state.master.fleets)
  const drivers = useSelector((state: RootState) => state.master.drivers)
  // Draft bisa edit penuh. Invoice Terbit bisa edit metode pembayaran + DP.
  // Outstanding/paid hanya boleh edit DP. Void tidak bisa di-edit.
  // Invoice VOID tidak bisa di-edit sama sekali.
  const isDraft = invoice?.status === InvoiceStatus.DRAFT
  const fullEditable = isDraft
  const canEditPaymentSetup = isDraft || invoice?.status === InvoiceStatus.SENT
  const canEditItems = isDraft || invoice?.status === InvoiceStatus.SENT

  const { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, calculateTax, totalAmount } = useInvoiceItems()

  useEffect(() => {
    if (invoice) {
      if (invoice.status === InvoiceStatus.VOID) {
        pushToast({ title: 'Tidak dapat diedit', description: 'Invoice void tidak dapat di-edit.', variant: 'error' })
        router.replace(`/invoice/${uuid}`)
        return
      }
      setDueDate(invoice.due_date)
      setNotes(invoice.notes ?? '')
      setPaymentMethod(invoice.payment_method ?? 'transfer')
      setBankAccountId(invoice.bank_account_id ?? null)
      setLampiranPaths(invoice.lampiran_paths ?? [])
      setRouteOrigin(invoice.origin ?? '')
      setRouteDestination(invoice.destination ?? '')
      setCargoDescription(invoice.cargo_description ?? '')
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
  }, [dispatch, fleets.length, drivers.length])

  useEffect(() => {
    if (role !== null && role !== 'super_admin' && role !== 'admin_finance') {
      router.replace('/surat-jalan')
    }
  }, [role, router])

  const effectiveInvoiceServiceType = resolveEffectiveInvoiceServiceType(invoice?.service_type, invoice?.custom_service_name)
  const isDeliveryLikeInvoice = effectiveInvoiceServiceType !== 'rental'
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

  const handleSave = async () => {
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
        lampiran_paths: lampiranPaths.length > 0 ? lampiranPaths : null,
        items: itemPayload,
        down_payment: dpPayload,
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
            payment_method: paymentMethod,
            bank_account_id: paymentMethod === 'transfer' ? bankAccountId : null,
            origin: isDeliveryLikeInvoice ? routeOrigin || null : null,
            destination: isDeliveryLikeInvoice ? routeDestination || null : null,
            cargo_description: isDeliveryLikeInvoice ? cargoDescription || null : null,
            ...(canEditItems && isDeliveryLikeInvoice ? { delivery_pricing_mode: deliveryPricingMode } : {}),
            ...(canEditItems ? { items: itemPayload } : {}),
            tax_percent: taxEnabled ? taxPercent : 0,
            pph_percent: pphEnabled ? pphPercent : 0,
            insurance_amount: insuranceEnabled ? insuranceAmount : 0,
            down_payment: dpPayload,
          }
        : { down_payment: dpPayload }

      const result = validateUpdateInvoice(dto as Parameters<typeof validateUpdateInvoice>[0], invoice?.service_type, invoice?.custom_service_name)
      setErrors(result.errors)
      if (!result.valid) {
        pushToast({ title: 'Data belum lengkap', description: Object.values(result.errors)[0], variant: 'error' })
        return
      }
    }

    const action = await dispatch(updateInvoice({ uuid, dto: dto as Parameters<typeof validateUpdateInvoice>[0] }))
    if (updateInvoice.fulfilled.match(action)) {
      pushToast({ title: 'Invoice Disimpan', description: `Invoice #${invoice?.invoice_number} berhasil diperbarui.`, variant: 'success' })
      router.push(`/invoice/${uuid}`)
    } else if (updateInvoice.rejected.match(action)) {
      pushToast({ title: 'Gagal Menyimpan', description: action.payload as string ?? 'Terjadi kesalahan. Coba lagi.', variant: 'error' })
    }
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
            {fullEditable
              ? `Mode Edit Penuh — Invoice #${invoice?.invoice_number}`
              : canEditPaymentSetup
                ? `Mode Edit Invoice Terbit — Invoice #${invoice?.invoice_number}`
                : `Mode Edit DP — Invoice #${invoice?.invoice_number}`
            }
          </div>
          <div className="text-xs" style={{ color: fullEditable ? '#B45309' : '#075985' }}>
            {fullEditable
              ? 'Anda sedang mengedit invoice draft. Perubahan belum disimpan.'
              : canEditPaymentSetup
                ? 'Invoice terbit bisa mengubah metode pembayaran, DP, rincian item, serta PPN/PPh/Asuransi.'
                : 'Invoice sudah berjalan. Hanya DP/Uang Muka yang bisa diedit. Item & pajak terkunci.'
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
                <label className="text-xs font-medium text-gray-600 block mb-1">Customer</label>
                <div className="form-input bg-gray-50 text-gray-500">{invoice?.customer.name}</div>
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
                <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Jatuh Tempo *</label>
                <input type="date" className="form-input w-full disabled:bg-gray-50 disabled:text-gray-500" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={!fullEditable} />
                {isDueDatePast && <p className="text-xs text-amber-600 mt-1">⚠ Tanggal jatuh tempo sudah terlewat</p>}
              </div>
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
                readOnlyStructure={!fullEditable}
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
                {fullEditable && (
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
                      if (!fullEditable) return
                      if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) reorderItems(dragFrom, dragOver)
                      setDragFrom(null); setDragOver(null)
                    }}
                    serviceType={effectiveInvoiceServiceType}
                    readOnlyStructure={!fullEditable}
                    sourceLabel={item.source_sj_id ? 'Sumber SJ' : 'Manual Invoice'}
                  />
                ))}
              </div>
              {fullEditable && (
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
          {canEditPaymentSetup && <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
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

          {/* Down Payment (Uang Muka) — bisa diedit di semua status non-void */}
          <DownPaymentForm
            totalAmount={canEditPaymentSetup ? nettoAmount : (invoice?.total_amount ?? 0)}
            initialValue={dpInitialValue}
            onChange={setDownPayment}
            defaultDate={invoice?.invoice_date}
            paymentMethod={paymentMethod}
          />
          {errors.down_payment && <p className="text-xs text-red-500 -mt-2">{errors.down_payment}</p>}

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
        <button onClick={handleSave} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
          Simpan Perubahan
        </button>
      </div>
      <div className="h-20" />
    </DashboardLayout>
  )
}
