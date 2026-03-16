'use client'

import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store'
import { assignSuratJalan, deliverSuratJalan, voidSuratJalan } from '@/store/slices/suratJalanSlice'
import { AssignSJInput } from '../../application/use-cases/AssignSuratJalan'
import { DeliverSJInput } from '../../application/use-cases/DeliverSuratJalan'

export default function useSJStatusTransition() {
  const dispatch = useDispatch<AppDispatch>()

  const assign = (uuid: string, input: AssignSJInput) => dispatch(assignSuratJalan({ uuid, input }))
  const deliver = (uuid: string, input: DeliverSJInput) => dispatch(deliverSuratJalan({ uuid, input }))
  const voidSJ = (uuid: string, reason: string) => dispatch(voidSuratJalan({ uuid, reason }))

  return { assign, deliver, voidSJ }
}
