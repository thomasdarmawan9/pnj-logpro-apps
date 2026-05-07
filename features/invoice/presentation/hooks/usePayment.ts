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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = (field: keyof RecordPaymentDto, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const submit = async (): Promise<{ ok: boolean; error?: string }> => {
    const result = validatePayment(form, remainingAmount)
    if (!result.valid) {
      setErrors(result.errors)
      return { ok: false }
    }
    setIsSubmitting(true)
    const action = await dispatch(recordPayment({ uuid: invoiceUuid, dto: form }))
    setIsSubmitting(false)
    if (recordPayment.rejected.match(action)) {
      return { ok: false, error: action.payload as string }
    }
    return { ok: true }
  }

  const reset = () => {
    setForm({ payment_date: today, amount: 0, method: 'transfer', proof_path: null, notes: '' })
    setErrors({})
    setIsSubmitting(false)
  }

  return { form, errors, isSubmitting, update, submit, reset }
}
