import { AgingARSummary } from '../../domain/entities/AgingARReport'
import { formatDate } from '@/lib/formatters'

export async function exportAgingARExcel(data: AgingARSummary): Promise<void> {
  const ExcelJS = (await import('exceljs')).default

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'

  const asOfDate = formatDate(data.as_of_date, { long: true })
  const sheet = workbook.addWorksheet(`Aging AR - ${asOfDate}`)

  // Header rows
  sheet.mergeCells('A1:I1')
  sheet.getCell('A1').value = 'PT. Pelangi Nuansa Jaya'
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.mergeCells('A2:I2')
  sheet.getCell('A2').value = 'Laporan Aging Piutang (AR)'
  sheet.getCell('A2').font = { bold: true, size: 12 }

  sheet.mergeCells('A3:I3')
  sheet.getCell('A3').value = `Per Tanggal: ${asOfDate}`
  sheet.getCell('A3').font = { size: 11 }

  // Column headers
  const headerRow = sheet.getRow(5)
  const headers = ['No', 'Customer', 'NPWP', 'Belum JT', '1-30 hr', '31-60 hr', '61-90 hr', '>90 hr', 'Total']
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A1E' } }
    cell.alignment = { horizontal: i >= 3 ? 'right' : 'left' }
  })

  let rowNum = 6
  let no = 1

  for (const customer of data.customers) {
    const row = sheet.getRow(rowNum++)
    row.getCell(1).value = no++
    row.getCell(2).value = customer.customer_name
    row.getCell(2).font = { bold: true }
    row.getCell(3).value = customer.npwp || '—'
    row.getCell(4).value = customer.bucket_totals['current']
    row.getCell(5).value = customer.bucket_totals['1-30']
    row.getCell(6).value = customer.bucket_totals['31-60']
    row.getCell(7).value = customer.bucket_totals['61-90']
    row.getCell(8).value = customer.bucket_totals['>90']
    row.getCell(9).value = customer.total_outstanding
    row.getCell(9).font = { bold: true }
    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

    // Conditional: bucket 61-90 > 0 → yellow
    if (customer.bucket_totals['61-90'] > 0) {
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
    }
    // Conditional: bucket >90 > 0 → red light
    if (customer.bucket_totals['>90'] > 0) {
      row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
    }

    // Sub-rows per invoice
    for (const inv of customer.invoices) {
      const invRow = sheet.getRow(rowNum++)
      invRow.getCell(2).value = `  ↳ #${inv.invoice_number} — ${inv.project_name}`
      invRow.getCell(2).font = { italic: true, color: { argb: 'FF6B7280' } }
      invRow.getCell(9).value = inv.remaining_amount
      invRow.getCell(9).font = { color: { argb: 'FF6B7280' } }
    }
  }

  // Grand total
  const totalRow = sheet.getRow(rowNum)
  totalRow.getCell(2).value = 'GRAND TOTAL'
  totalRow.getCell(2).font = { bold: true }
  totalRow.getCell(4).value = data.bucket_totals['current']
  totalRow.getCell(5).value = data.bucket_totals['1-30']
  totalRow.getCell(6).value = data.bucket_totals['31-60']
  totalRow.getCell(7).value = data.bucket_totals['61-90']
  totalRow.getCell(8).value = data.bucket_totals['>90']
  totalRow.getCell(9).value = data.total_outstanding
  for (let i = 1; i <= 9; i++) {
    const cell = totalRow.getCell(i)
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
  }

  // Column widths
  sheet.getColumn(1).width = 5
  sheet.getColumn(2).width = 35
  sheet.getColumn(3).width = 22
  for (let i = 4; i <= 9; i++) sheet.getColumn(i).width = 18

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Aging_AR_${data.as_of_date}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
