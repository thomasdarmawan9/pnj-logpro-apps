import { CreateInvoiceItemDto, CreateDownPaymentDto } from './CreateInvoiceDto'

export interface UpdateInvoiceDto {
  invoice_date?: string
  due_date?: string
  /**
   * Ganti customer — hanya untuk invoice tanpa proyek. Bila invoice punya SJ
   * terlampir, customer SJ ikut diubah di backend. Diizinkan di semua status.
   */
  customer_id?: number
  /** Tanggal pelunasan (hanya invoice lunas) — mengubah payment_date pembayaran pelunas. */
  settlement_date?: string
  delivery_date?: string | null
  delivery_pricing_mode?: 'shipment' | 'item'
  payment_method?: 'transfer' | 'cash' | 'check'
  bank_account_id?: number | null
  tax_percent?: number
  pph_percent?: number
  insurance_amount?: number
  notes?: string | null
  origin?: string | null
  destination?: string | null
  cargo_description?: string | null
  manual_sj_numbers?: string | null
  auto_create_sj?: boolean
  overwrite_sj_confirmed?: boolean
  items?: CreateInvoiceItemDto[]
  lampiran_paths?: string[] | null
  /**
   * DP edit:
   *   - object → upsert (create kalau belum ada, replace kalau sudah)
   *   - null   → hapus DP existing
   *   - undefined (tidak dikirim) → tidak diubah
   *
   * Backend mengizinkan edit DP di semua status invoice KECUALI void,
   * sehingga PUT dengan hanya { down_payment: ... } bisa dipakai untuk
   * koreksi DP pada invoice paid/sent/outstanding.
   */
  down_payment?: CreateDownPaymentDto | null
}
