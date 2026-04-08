import { AgingARProjectDetail } from './AgingARProjectDetail'

export interface AgingARCustomerDetail {
  customer_id: number
  customer_name: string
  npwp: string | null
  is_pkp: boolean
  project_count: number
  invoice_count: number
  sj_count: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  projects: AgingARProjectDetail[]
}
