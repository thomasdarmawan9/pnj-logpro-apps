export interface RecordPaymentDto {
  payment_date: string
  amount: number
  method: 'transfer' | 'cash' | 'check'
  proof_path?: string | null
  notes?: string | null
}
