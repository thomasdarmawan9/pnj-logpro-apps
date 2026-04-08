import { useState } from 'react'
import { MOCK_PROJECTS } from '@/lib/mockData/invoice'

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

  const selectedProject = MOCK_PROJECTS.find(p => p.id === header.project_id) ?? null

  const updateHeader = (field: keyof InvoiceFormHeader, value: string | number | null) => {
    setHeader(prev => ({ ...prev, [field]: value }))
  }

  const selectProject = (projectId: number) => {
    const project = MOCK_PROJECTS.find(p => p.id === projectId)
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
    projects: MOCK_PROJECTS,
  }
}
