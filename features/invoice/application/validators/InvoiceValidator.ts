import { CreateInvoiceDto, CreateDownPaymentDto } from '../dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../dto/UpdateInvoiceDto'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'
import { todayDateOnly } from '@/lib/dateOnly'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

const VALID_PAYMENT_METHODS = ['transfer', 'cash', 'check'] as const
const VALID_SERVICE_TYPES = ['delivery', 'rental', 'other'] as const
const VALID_DELIVERY_PRICING_MODES = ['shipment', 'item'] as const
const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'

function validateDownPayment(
  dp: CreateDownPaymentDto | null | undefined,
  errors: Record<string, string>,
  prefix = 'down_payment',
  invoiceDate?: string,
): void {
  if (dp === null || dp === undefined) return

  if (!dp.payment_date) {
    errors[`${prefix}.payment_date`] = 'Tanggal DP wajib diisi'
  } else if (dp.payment_date > todayDateOnly()) {
    errors[`${prefix}.payment_date`] = 'Tanggal DP tidak boleh melewati hari ini'
  } else if (invoiceDate && dp.payment_date < invoiceDate) {
    errors[`${prefix}.payment_date`] = 'Tanggal DP tidak boleh sebelum tanggal invoice'
  }
  if (typeof dp.amount !== 'number' || dp.amount <= 0) {
    errors[`${prefix}.amount`] = 'Nominal DP harus lebih dari 0'
  }
  if (!dp.method || !VALID_PAYMENT_METHODS.includes(dp.method)) {
    errors[`${prefix}.method`] = 'Metode pembayaran tidak valid'
  }
}

function isDeliveryAdditionalCharge(item: { fleet_label?: string; unit_price?: number; cargo_qty?: number | null }): boolean {
  return item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined)
}

function validateDeliveryPricing(
  items: CreateInvoiceDto['items'] | UpdateInvoiceDto['items'],
  mode: 'shipment' | 'item',
  errors: Record<string, string>,
): void {
  const billableItems = (items ?? []).filter(item => !isDeliveryAdditionalCharge(item))
  if (billableItems.length === 0) {
    if (mode === 'item') {
      errors.items = 'Minimal 1 rincian barang/muatan wajib diisi untuk harga per barang'
    }
    return
  }

  if (mode === 'item') {
    billableItems.forEach((item, idx) => {
      if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty harga wajib diisi'
      if (!item.unit_price || item.unit_price <= 0) errors[`items.${idx}.unit_price`] = 'Harga barang wajib diisi'
    })
    return
  }

  const hasDeliveryPrice = billableItems.some(item => item.unit_price > 0 && item.qty > 0)
  if (!hasDeliveryPrice) {
    errors['items.0.unit_price'] = 'Harga pengiriman wajib diisi'
  }
}

export function validateCreateInvoice(dto: CreateInvoiceDto): ValidationResult {
  const errors: Record<string, string> = {}

  if (!dto.project_id && !dto.customer_id) errors.project_id = 'Pilih proyek atau customer'
  if (!dto.service_type || !VALID_SERVICE_TYPES.includes(dto.service_type)) {
    errors.service_type = 'Jenis jasa wajib dipilih'
  }
  if (dto.service_type === 'other' && !dto.custom_service_name?.trim()) {
    errors.custom_service_name = 'Nama jasa wajib diisi'
  }
  if (dto.delivery_pricing_mode && !VALID_DELIVERY_PRICING_MODES.includes(dto.delivery_pricing_mode)) {
    errors.delivery_pricing_mode = 'Mode harga pengiriman tidak valid'
  }
  if (!dto.invoice_date) errors.invoice_date = 'Tanggal invoice wajib diisi'
  if (dto.invoice_date && dto.invoice_date > todayDateOnly()) errors.invoice_date = 'Tanggal invoice tidak boleh melewati hari ini'
  if (!dto.due_date) errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  if (dto.invoice_date && dto.due_date && dto.due_date < dto.invoice_date) errors.due_date = 'Tanggal jatuh tempo tidak boleh sebelum tanggal invoice'
  if (!dto.payment_method || !VALID_PAYMENT_METHODS.includes(dto.payment_method)) {
    errors.payment_method = 'Metode pembayaran wajib dipilih'
  }
  if (dto.payment_method === 'transfer' && !dto.bank_account_id) {
    errors.bank_account_id = 'Rekening tujuan wajib dipilih untuk metode Transfer Bank'
  }
  const effectiveServiceType = resolveEffectiveInvoiceServiceType(dto.service_type, dto.custom_service_name)
  if (effectiveServiceType !== 'rental') {
    validateDeliveryPricing(dto.items, dto.delivery_pricing_mode ?? 'shipment', errors)
  }
  if (effectiveServiceType === 'rental' && (!dto.items || dto.items.length === 0)) {
    errors.items = 'Minimal 1 rincian item wajib diisi untuk invoice penyewaan'
  }
  dto.items?.forEach((item, idx) => {
    if (effectiveServiceType === 'rental' && !item.fleet_id) {
      errors[`items.${idx}.fleet_id`] = 'Pilih armada aktif dari master untuk invoice penyewaan'
    }
    if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
    if (effectiveServiceType === 'rental' && (!item.unit_price || item.unit_price <= 0)) {
      errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
    }
    if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
  })

  // Validasi DP jika dikirim.
  if (dto.down_payment) {
    validateDownPayment(dto.down_payment, errors, 'down_payment', dto.invoice_date)
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateUpdateInvoice(
  dto: UpdateInvoiceDto,
  serviceType?: 'delivery' | 'rental' | 'other',
  customServiceName?: string | null,
  currentInvoiceDate?: string,
): ValidationResult {
  const errors: Record<string, string> = {}

  if (dto.invoice_date !== undefined && !dto.invoice_date) {
    errors.invoice_date = 'Tanggal invoice wajib diisi'
  }
  if (dto.invoice_date && dto.invoice_date > todayDateOnly()) {
    errors.invoice_date = 'Tanggal invoice tidak boleh melewati hari ini'
  }
  if (dto.due_date !== undefined && !dto.due_date) {
    errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  }
  if (dto.payment_method !== undefined && !VALID_PAYMENT_METHODS.includes(dto.payment_method)) {
    errors.payment_method = 'Metode pembayaran wajib dipilih'
  }
  if (dto.payment_method === 'transfer' && !dto.bank_account_id) {
    errors.bank_account_id = 'Rekening tujuan wajib dipilih untuk metode Transfer Bank'
  }

  if (dto.items !== undefined && dto.items.length > 0) {
    const effectiveServiceType = resolveEffectiveInvoiceServiceType(serviceType, customServiceName)
    if (effectiveServiceType !== 'rental') {
      validateDeliveryPricing(dto.items, dto.delivery_pricing_mode ?? 'shipment', errors)
    }
    dto.items?.forEach((item, idx) => {
      if (effectiveServiceType === 'rental' && !item.fleet_id) {
        errors[`items.${idx}.fleet_id`] = 'Pilih armada aktif dari master untuk invoice penyewaan'
      }
      if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
      if (effectiveServiceType === 'rental' && (!item.unit_price || item.unit_price <= 0)) {
        errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
      }
      if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
    })
  }

  // Validasi DP jika dikirim. `null` valid (clear DP), object butuh validasi.
  if (dto.down_payment !== undefined && dto.down_payment !== null) {
    // Saat update kita tidak hitung total dari sini — BE akan validate dengan
    // total yang akurat (untuk kasus DP-only edit di invoice paid/sent).
    // FE hanya cek shape (date, amount > 0, method valid).
    validateDownPayment(dto.down_payment, errors, 'down_payment', dto.invoice_date ?? currentInvoiceDate)
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
