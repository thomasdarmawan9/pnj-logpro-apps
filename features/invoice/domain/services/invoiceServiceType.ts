import type { InvoiceServiceType } from '../entities/Invoice'

export type EffectiveInvoiceServiceType = 'delivery' | 'rental'

export function resolveEffectiveInvoiceServiceType(
  serviceType: InvoiceServiceType | undefined | null,
  customServiceName?: string | null,
): EffectiveInvoiceServiceType {
  if (serviceType === 'rental') return 'rental'
  if (serviceType === 'other') {
    const name = String(customServiceName || '').toLowerCase()
    if (name.includes('penyewaan') || name.includes('sewa')) return 'rental'
    if (name.includes('pengiriman')) return 'delivery'
  }
  return 'delivery'
}
