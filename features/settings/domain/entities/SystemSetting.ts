export interface NumberingSettings {
  sj_format: string
  sj_seq_current: number
  sj_seq_reset: 'yearly' | 'never'
  invoice_format: string
  invoice_seq_current: number
  invoice_seq_reset: 'yearly' | 'never'
  stock_receipt_format: string
  stock_disburse_format: string
}

export interface BankAccount {
  id: number
  uuid: string
  bank_name: string
  account_number: string
  account_holder: string
  is_active: boolean
  sort_order: number
}

export interface CompanyProfile {
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  company_bank_name: string
  company_bank_account: string
  company_bank_holder: string
  company_logo_path: string | null
  default_tax_percent: number
}

export const DEFAULT_NUMBERING: NumberingSettings = {
  sj_format: 'SJ-{YYYY}-{SEQ4}',
  sj_seq_current: 89,
  sj_seq_reset: 'yearly',
  invoice_format: '{SEQ}',
  invoice_seq_current: 2829,
  invoice_seq_reset: 'never',
  stock_receipt_format: 'STK-MSK-{YYYY}-{SEQ3}',
  stock_disburse_format: 'STK-KLR-{YYYY}-{SEQ3}',
}

export const DEFAULT_COMPANY: CompanyProfile = {
  company_name: 'PT. Pelangi Nuansa Jaya',
  company_address: 'Jl. Arteri Supadio, Komplek Adijaya town house, block c no 1 dan 2, Kubu Raya, Kalimantan Barat',
  company_phone: '0858-4901-6746 / 0822-5412-1996',
  company_email: 'pelanginuansagroup@gmail.com',
  company_website: 'www.ekspedisipontianakkalbar.com',
  company_bank_name: 'BCA',
  company_bank_account: '7345265678',
  company_bank_holder: 'PT. Pelangi Nuansa Jaya',
  company_logo_path: null,
  default_tax_percent: 1.10,
}

export function parseNumberFormat(format: string, seqCurrent: number): string {
  const next = seqCurrent + 1
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return format
    .replace('{YYYY}', yyyy)
    .replace('{MM}', mm)
    .replace('{DD}', dd)
    .replace('{SEQ4}', String(next).padStart(4, '0'))
    .replace('{SEQ3}', String(next).padStart(3, '0'))
    .replace('{SEQ2}', String(next).padStart(2, '0'))
    .replace('{SEQ}', String(next))
}
