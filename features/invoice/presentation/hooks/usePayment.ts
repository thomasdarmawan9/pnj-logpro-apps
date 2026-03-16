import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '@/store'
import { recordPayment } from '@/store/slices/invoiceSlice'
import { RecordPaymentDto } from '../../application/dto/RecordPaymentDto'
import { validatePayment } from '../../application/validators/PaymentValidator'

export default function usePayment(invoiceUuid: string, remainingAmount: number) {
  const dispatch = useDispatch<AppDispatch>()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<RecordPaymentDto>({
    payment_date: today,
    amount: 0,
    method: 'transfer',
    proof_path: null,
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: keyof RecordPaymentDto, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const submit = async () => {
    const result = validatePayment(form, remainingAmount)
    if (!result.valid) {
      setErrors(result.errors)
      return false
    }
    await dispatch(recordPayment({ uuid: invoiceUuid, dto: form }))
    return true
  }

  const reset = () => {
    setForm({ payment_date: today, amount: 0, method: 'transfer', proof_path: null, notes: '' })
    setErrors({})
  }

  return { form, errors, update, submit, reset }
}
