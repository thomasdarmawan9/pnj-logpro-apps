import { CreateInvoiceItemDto, CreateDownPaymentDto } from './CreateInvoiceDto'

export interface UpdateInvoiceDto {
  invoice_date?: string
  due_date?: string
  payment_method?: 'transfer' | 'cash' | 'check'
  bank_account_id?: number | null
  tax_percent?: number
  pph_percent?: number
  notes?: string | null
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
