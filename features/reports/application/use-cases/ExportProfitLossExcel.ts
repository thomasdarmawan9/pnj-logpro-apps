import { ProfitLossSummary } from '../../domain/entities/ProfitLossReport'
import { formatDate } from '@/lib/formatters'

export async function exportProfitLossExcel(data: ProfitLossSummary): Promise<void> {
  const ExcelJS = (await import('exceljs')).default

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'

  // Sheet 1: Summary
  const summary = workbook.addWorksheet('P&L Summary')

  summary.mergeCells('A1:J1')
  summary.getCell('A1').value = 'PT. Pelangi Nuansa Jaya'
  summary.getCell('A1').font = { bold: true, size: 14 }

  summary.mergeCells('A2:J2')
  summary.getCell('A2').value = 'Laporan Profit & Loss per Proyek'
  summary.getCell('A2').font = { bold: true, size: 12 }

  summary.mergeCells('A3:J3')
  summary.getCell('A3').value = `Periode: ${formatDate(data.period_from, { long: true })} – ${formatDate(data.period_to, { long: true })}`

  const hRow = summary.getRow(5)
  const headers = ['No', 'Proyek', 'Kode', 'Customer', 'Status', 'Rev Ditagih', 'Rev Terbayar', 'Biaya Ops', 'Gross Profit', 'Margin']
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A1E' } }
  })

  let rowNum = 6
  let no = 1
  for (const p of data.projects) {
    const row = summary.getRow(rowNum++)
    row.getCell(1).value = no++
    row.getCell(2).value = p.project_name
    row.getCell(2).font = { bold: true }
    row.getCell(3).value = p.project_code
    row.getCell(4).value = p.customer_name
    row.getCell(5).value = p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Selesai' : 'Ditunda'
    row.getCell(6).value = p.revenue_invoiced
    row.getCell(7).value = p.revenue_paid
    row.getCell(8).value = p.total_operational_cost
    row.getCell(9).value = p.gross_profit
    row.getCell(10).value = p.margin_percent !== null ? `${p.margin_percent.toFixed(1)}%` : '—'

    if (p.profitability === 'loss') {
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      row.getCell(9).font = { color: { argb: 'FFDC2626' } }
    } else if (p.profitability === 'profit') {
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
      row.getCell(9).font = { color: { argb: 'FF16A34A' } }
    }
  }

  // Grand Total
  const totalRow = summary.getRow(rowNum)
  totalRow.getCell(2).value = 'GRAND TOTAL'
  totalRow.getCell(7).value = data.total_revenue_paid
  totalRow.getCell(8).value = data.total_operational_cost
  totalRow.getCell(9).value = data.total_gross_profit
  totalRow.getCell(10).value = data.average_margin !== null ? `${data.average_margin.toFixed(1)}%` : '—'
  for (let i = 1; i <= 10; i++) {
    totalRow.getCell(i).font = { bold: true }
    totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
  }

  summary.getColumn(1).width = 5
  summary.getColumn(2).width = 35
  summary.getColumn(3).width = 15
  summary.getColumn(4).width = 25
  summary.getColumn(5).width = 12
  for (let i = 6; i <= 10; i++) summary.getColumn(i).width = 18

  // Sheet per project (only with data)
  for (const project of data.projects) {
    if (!project.invoices?.length && !project.sj_list?.length) continue

    const sheet = workbook.addWorksheet(`P&L - ${project.project_code}`.slice(0, 31))
    sheet.mergeCells('A1:F1')
    sheet.getCell('A1').value = project.project_name
    sheet.getCell('A1').font = { bold: true, size: 12 }

    if (project.invoices?.length) {
      sheet.getCell('A3').value = 'Invoice'
      sheet.getCell('A3').font = { bold: true }
      const iHeader = sheet.getRow(4)
      ;['No Invoice', 'Total', 'Status'].forEach((h, i) => {
        iHeader.getCell(i + 1).value = h
        iHeader.getCell(i + 1).font = { bold: true }
      })
      project.invoices.forEach((inv, idx) => {
        const r = sheet.getRow(5 + idx)
        r.getCell(1).value = inv.invoice_number
        r.getCell(2).value = inv.total_amount
        r.getCell(3).value = inv.status
      })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `PnL_${data.period_from}_${data.period_to}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
