import { AgingARCustomerDetail } from '../../domain/entities/AgingARCustomerDetail'
import { MOCK_PROJECT_DETAILS } from '@/lib/mockData/reports'

export class GetAgingARCustomerDetail {
  execute(customerId: number): AgingARCustomerDetail {
    const projects = Object.values(MOCK_PROJECT_DETAILS)
      .filter(project => project.customer_id === customerId)

    if (!projects.length) {
      throw new Error(`Customer detail tidak ditemukan untuk customer_id: ${customerId}`)
    }

    const base = projects[0]

    const summary = projects.reduce((acc, project) => {
      acc.total_invoiced += project.total_invoiced
      acc.total_paid += project.total_paid
      acc.total_outstanding += project.total_outstanding
      acc.invoice_count += project.invoice_count
      acc.sj_count += project.sj_count
      return acc
    }, {
      total_invoiced: 0,
      total_paid: 0,
      total_outstanding: 0,
      invoice_count: 0,
      sj_count: 0,
    })

    return {
      customer_id: base.customer_id,
      customer_name: base.customer_name,
      npwp: base.npwp,
      is_pkp: base.is_pkp,
      project_count: projects.length,
      invoice_count: summary.invoice_count,
      sj_count: summary.sj_count,
      total_invoiced: summary.total_invoiced,
      total_paid: summary.total_paid,
      total_outstanding: summary.total_outstanding,
      projects,
    }
  }
}

export const getAgingARCustomerDetail = new GetAgingARCustomerDetail()
