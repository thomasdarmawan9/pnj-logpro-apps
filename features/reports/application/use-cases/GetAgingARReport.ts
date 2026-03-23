import { AgingARSummary } from '../../domain/entities/AgingARReport'
import { AgingBucket, ALL_BUCKETS, emptyBucketTotals } from '../../domain/value-objects/AgingBucket'
import { AgingARFilterDto } from '../dto/AgingARFilterDto'
import { MOCK_AGING_AR } from '@/lib/mockData/reports'

export class GetAgingARReport {
  execute(filters: AgingARFilterDto): AgingARSummary {
    let customers = [...MOCK_AGING_AR.customers]

    // Apply customer filter
    if (filters.customerId && filters.customerId !== 'all') {
      customers = customers.filter(c => c.customer_id === filters.customerId)
    }

    // Apply bucket filter
    if (filters.bucket && filters.bucket !== 'all') {
      customers = customers.filter(c => c.bucket_totals[filters.bucket as AgingBucket] > 0)
    }

    // Apply search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      customers = customers.filter(c =>
        c.customer_name.toLowerCase().includes(q) ||
        c.invoices.some(inv => inv.invoice_number.includes(q) || inv.project_name.toLowerCase().includes(q))
      )
    }

    // Recalculate totals from filtered customers
    const bucketTotals = emptyBucketTotals()
    let totalOutstanding = 0
    let invoiceCount = 0

    for (const customer of customers) {
      totalOutstanding += customer.total_outstanding
      invoiceCount += customer.invoice_count
      for (const bucket of ALL_BUCKETS) {
        bucketTotals[bucket] += customer.bucket_totals[bucket]
      }
    }

    // Sort by total_outstanding desc
    customers.sort((a, b) => b.total_outstanding - a.total_outstanding)

    return {
      ...MOCK_AGING_AR,
      customers,
      total_outstanding: totalOutstanding,
      customer_count: customers.length,
      invoice_count: invoiceCount,
      bucket_totals: bucketTotals,
    }
  }
}

export const getAgingARReport = new GetAgingARReport()
