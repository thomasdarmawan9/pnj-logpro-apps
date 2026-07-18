import { useEffect, useState } from 'react'
import { apiRequestAllPages } from '@/lib/apiClient'
import { addDaysDateOnly, todayDateOnly } from '@/lib/dateOnly'

interface InvoiceProjectOption {
  id: number
  uuid: string
  code: string
  name: string
  contract_number: string
  customer: {
    id: number
    name: string
    address?: string | null
    npwp?: string | null
    is_pkp: boolean
  }
}

interface ApiProjectOption extends Omit<InvoiceProjectOption, 'id' | 'customer'> {
  id: number | string
  customer: Omit<InvoiceProjectOption['customer'], 'id'> & { id: number | string }
}

function normalizeProject(project: ApiProjectOption): InvoiceProjectOption {
  return {
    ...project,
    id: Number(project.id),
    customer: {
      ...project.customer,
      id: Number(project.customer.id),
      is_pkp: Boolean(project.customer.is_pkp),
    },
  }
}

export interface InvoiceFormHeader {
  project_id: number | null
  invoice_date: string
  due_date: string
  notes: string
}

export default function useInvoiceForm(initial?: Partial<InvoiceFormHeader>) {
  const today = todayDateOnly()
  const defaultDue = addDaysDateOnly(today, 30)

  const [header, setHeader] = useState<InvoiceFormHeader>({
    project_id: initial?.project_id ?? null,
    invoice_date: initial?.invoice_date ?? today,
    due_date: initial?.due_date ?? defaultDue,
    notes: initial?.notes ?? '',
  })

  const [taxPercent, setTaxPercent] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)

  const [pphPercent, setPphPercent] = useState(2)
  const [pphEnabled, setPphEnabled] = useState(false)
  const [insuranceEnabled, setInsuranceEnabled] = useState(false)
  const [insuranceAmount, setInsuranceAmount] = useState(0)
  const [projects, setProjects] = useState<InvoiceProjectOption[]>([])

  useEffect(() => {
    let alive = true
    apiRequestAllPages<ApiProjectOption>('/projects?status=active', { method: 'GET' })
      .then(data => {
        if (alive) setProjects(data.map(normalizeProject))
      })
      .catch(() => {
        if (alive) setProjects([])
      })
    return () => { alive = false }
  }, [])

  const selectedProject = projects.find(p => p.id === header.project_id) ?? null

  const updateHeader = (field: keyof InvoiceFormHeader, value: string | number | null) => {
    setHeader(prev => ({ ...prev, [field]: value }))
  }

  const selectProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    setHeader(prev => ({ ...prev, project_id: projectId }))
    if (project.customer.is_pkp) {
      setTaxEnabled(true)
      setTaxPercent(1.1)
    } else {
      setTaxEnabled(false)
      setTaxPercent(0)
    }
  }

  const toggleTax = (enabled: boolean) => {
    setTaxEnabled(enabled)
    setTaxPercent(enabled ? 1.1 : 0)
  }

  const togglePph = (enabled: boolean) => {
    setPphEnabled(enabled)
    if (enabled && pphPercent === 0) setPphPercent(2)
  }

  const toggleInsurance = (enabled: boolean) => {
    setInsuranceEnabled(enabled)
    if (!enabled) setInsuranceAmount(0)
  }

  const isDueDatePast = header.due_date < today

  return {
    header,
    taxPercent,
    taxEnabled,
    pphPercent,
    pphEnabled,
    insuranceEnabled,
    insuranceAmount,
    selectedProject,
    updateHeader,
    selectProject,
    toggleTax,
    setTaxPercent,
    togglePph,
    setPphPercent,
    toggleInsurance,
    setInsuranceAmount,
    isDueDatePast,
    projects,
  }
}
