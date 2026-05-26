'use client'

import { useMemo, useState } from 'react'
import { CreateSJDto } from '../../application/dto/CreateSJDto'
import { UpdateSJDto } from '../../application/dto/UpdateSJDto'
import { validateCreateSJ, validateUpdateSJ } from '../../application/validators/SJValidator'

interface UseSuratJalanFormOptions {
  mode: 'create' | 'edit'
  initial?: Partial<CreateSJDto>
}

export default function useSuratJalanForm({ mode, initial }: UseSuratJalanFormOptions) {
  const [form, setForm] = useState<CreateSJDto>({
    project_id: initial?.project_id ?? null,
    customer_id: initial?.customer_id ?? null,
    fleet_id: initial?.fleet_id || 0,
    driver_id: initial?.driver_id ?? null,
    driver_name_manual: initial?.driver_name_manual ?? '',
    sj_date: initial?.sj_date || new Date().toISOString().slice(0, 10),
    origin: initial?.origin || '',
    destination: initial?.destination || '',
    cargo_description: initial?.cargo_description || '',
    items: initial?.items || [],
    operational_cost: initial?.operational_cost || 0,
    internal_notes: initial?.internal_notes || '',
    publish: initial?.publish || false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = <K extends keyof CreateSJDto>(key: K, value: CreateSJDto[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const validate = (publishOverride?: boolean) => {
    if (mode === 'create') {
      const result = validateCreateSJ({ ...form, publish: publishOverride ?? form.publish })
      setErrors(result.errors)
      return result.valid
    }
    const result = validateUpdateSJ(form as UpdateSJDto)
    setErrors(result.errors)
    return result.valid
  }

  const isDirty = useMemo(() => (
    !!form.origin.trim() ||
    !!form.destination.trim() ||
    !!form.cargo_description?.trim() ||
    !!form.internal_notes?.trim() ||
    form.items.length > 0
  ), [form])

  return {
    form,
    setForm,
    updateField,
    errors,
    setErrors,
    validate,
    isDirty,
  }
}
