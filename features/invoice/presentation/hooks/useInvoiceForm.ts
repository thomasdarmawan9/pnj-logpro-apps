import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/apiClient'

interface InvoiceProjectOption {
  id: number
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
  const today = new Date().toISOString().split('T')[0]
  const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
  const [projects, setProjects] = useState<InvoiceProjectOption[]>([])

  useEffect(() => {
    let alive = true
    apiRequest<ApiProjectOption[]>('/projects?status=active&page=1&limit=100', { method: 'GET' })
      .then(response => {
        if (alive) setProjects(response.data.map(normalizeProject))
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

  const isDueDatePast = header.due_date < today

  return {
    header,
    taxPercent,
    taxEnabled,
    pphPercent,
    pphEnabled,
    selectedProject,
    updateHeader,
    selectProject,
    toggleTax,
    setTaxPercent,
    togglePph,
    setPphPercent,
    isDueDatePast,
    projects,
  }
}
