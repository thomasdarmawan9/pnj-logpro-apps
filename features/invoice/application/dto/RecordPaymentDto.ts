export interface RecordPaymentDto {
  payment_date: string
  amount: number
  method: 'transfer' | 'cash' | 'check'
  proof_path?: string | null
  notes?: string | null
}

export interface BulkRecordPaymentDto {
  payment_date: string
  payments: Array<{
    invoice_uuid: string
    method: 'transfer' | 'cash' | 'check'
  }>
  notes?: string | null
}
