import type { FleetUtilization, FleetUtilizationSummary } from '@/features/reports/domain/entities/FleetUtilizationReport'
import type { UtilizationFilters } from '@/features/reports/presentation/hooks/useFleetUtilization'

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
  7: 'Jul', 8: 'Agu', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

function formatDateID(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_LABELS[d.getMonth() + 1]} ${d.getFullYear()}`
}

function rupiahPlain(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    truck: 'Truck',
    trailer: 'Trailer',
    family_car: 'Mobil Keluarga',
    heavy_equipment: 'Alat Berat',
    other: 'Lainnya',
  }
  return map[cat] ?? cat
}

export async function exportFleetUtilizationExcel(
  summary: FleetUtilizationSummary,
  fleets: FleetUtilization[],
  filters: UtilizationFilters,
) {
  // Dynamic import to keep ExcelJS out of the main bundle
  const ExcelJS = (await import('exceljs')).default

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Logpro'
  wb.created = new Date()

  // Sheet name: "Utilisasi Armada - Mar 2026"
  const fromDate = new Date(summary.period_from)
  const sheetLabel = `${MONTH_LABELS[fromDate.getMonth() + 1]} ${fromDate.getFullYear()}`
  const ws = wb.addWorksheet(`Utilisasi Armada - ${sheetLabel}`)

  const GREEN = '166534' // --green-primary equivalent (#16A34A → hex without #)
  const HEADER_BG = '16A34A'
  const HEADER_FG = 'FFFFFF'
  const SUBHEADER_BG = 'F1F5F9'
  const BORDER_COLOR = 'CBD5E1'

  const totalCols = 15 // A through O

  // Helper: merge and set value for a row
  const mergeHeader = (rowNum: number, value: string, bold = false, fontSize = 11) => {
    ws.mergeCells(rowNum, 1, rowNum, totalCols)
    const row = ws.getRow(rowNum)
    const cell = row.getCell(1)
    cell.value = value
    cell.font = { bold, size: fontSize, color: { argb: bold ? '000000' : '64748B' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    row.height = fontSize > 11 ? fontSize * 2.2 : 18
  }

  // ── Title block ──────────────────────────────────────────────
  mergeHeader(1, 'PT. Pelangi Nuansa Jaya', true, 16)
  mergeHeader(2, 'Laporan Utilisasi Armada', true, 13)
  mergeHeader(3, `Periode: ${formatDateID(summary.period_from)} s/d ${formatDateID(summary.period_to)}`, false, 11)

  // Row 4: empty spacer
  ws.getRow(4).height = 8

  // ── Column headers (row 5) ────────────────────────────────────
  const headers = [
    { label: 'No',            width: 5 },
    { label: 'Plat Nomor',    width: 14 },
    { label: 'Nama Armada',   width: 22 },
    { label: 'Kategori',      width: 16 },
    { label: 'Total Trip',    width: 11 },
    { label: 'Terkirim',      width: 10 },
    { label: 'Hari Aktif',    width: 11 },
    { label: 'Total Hari',    width: 11 },
    { label: 'Utilisasi (%)', width: 13 },
    { label: 'Biaya Ops (Rp)', width: 18 },
    { label: 'Avg/Trip (Rp)', width: 16 },
    { label: 'Proyek Unik',   width: 12 },
    { label: 'Customer Unik', width: 13 },
    { label: 'Supir',         width: 28 },
    { label: 'Status',        width: 10 },
  ]

  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = h.width
  })

  const headerRow = ws.getRow(5)
  headerRow.height = 22
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h.label
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    }
  })

  // ── Data rows ─────────────────────────────────────────────────
  fleets.forEach((f, idx) => {
    const row = ws.addRow([
      idx + 1,
      f.plate_number,
      f.fleet_name,
      categoryLabel(f.category),
      f.total_trips,
      f.delivered_trips,
      f.active_days,
      f.total_days_in_period,
      f.total_trips > 0 ? f.utilization_percent : 0,
      f.total_operational_cost,
      f.avg_cost_per_trip,
      f.unique_projects,
      f.unique_customers,
      f.drivers_used.join(', ') || '—',
      f.status === 'active' ? 'Aktif' : f.status === 'inactive' ? 'Tidak Aktif' : 'Terjual',
    ])
    row.height = 18
    const isIdle = f.total_trips === 0

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { size: 10, color: { argb: isIdle ? '94A3B8' : '1E293B' } }
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      }
      if (isIdle) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } }
      }

      // Number formats
      if (colNumber === 9) {
        // Utilization %
        cell.numFmt = '0.0"%"'
        cell.alignment = { horizontal: 'center' }
      } else if (colNumber === 10 || colNumber === 11) {
        // Currency columns — store raw numbers, format with Rp prefix
        if (typeof cell.value === 'number' && cell.value > 0) {
          cell.numFmt = '"Rp "#,##0'
        } else {
          cell.value = '—'
          cell.alignment = { horizontal: 'center' }
        }
      } else if ([1, 5, 6, 7, 8, 12, 13].includes(colNumber)) {
        cell.alignment = { horizontal: 'center' }
      } else if (colNumber === 2) {
        cell.font = { ...cell.font, bold: true, color: { argb: isIdle ? '94A3B8' : GREEN } }
      }
    })
  })

  // ── Spacer row ────────────────────────────────────────────────
  const spacerRow = ws.addRow([])
  spacerRow.height = 6

  // ── Footer summary ────────────────────────────────────────────
  const footerData = [
    ['RATA-RATA UTILISASI', `${summary.avg_utilization.toFixed(1)}%`],
    ['TOTAL BIAYA OPERASIONAL', `Rp ${rupiahPlain(summary.total_operational_cost)}`],
    ['TOTAL TRIP', `${summary.total_trips} trip`],
  ]

  footerData.forEach(([label, value]) => {
    const r = ws.addRow([])
    // Merge cols 1-3 for label
    const startRow = r.number
    ws.mergeCells(startRow, 1, startRow, 4)
    ws.mergeCells(startRow, 5, startRow, totalCols)

    const labelCell = r.getCell(1)
    labelCell.value = label
    labelCell.font = { bold: true, size: 10, color: { argb: '1E293B' } }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEADER_BG } }
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' }

    const valueCell = r.getCell(5)
    valueCell.value = value
    valueCell.font = { bold: true, size: 11, color: { argb: GREEN } }
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEADER_BG } }
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' }
    r.height = 20
  })

  // ── Generated timestamp ───────────────────────────────────────
  const tsRow = ws.addRow([])
  const tsLabel = `Dicetak pada: ${formatDateID(new Date().toISOString())}`
  ws.mergeCells(tsRow.number, 1, tsRow.number, totalCols)
  const tsCell = tsRow.getCell(1)
  tsCell.value = tsLabel
  tsCell.font = { italic: true, size: 9, color: { argb: '94A3B8' } }
  tsCell.alignment = { horizontal: 'right' }
  tsRow.height = 16

  // ── Write buffer & download ───────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const filterLabel = filters.periodPreset === 'this_month'
    ? sheetLabel
    : filters.periodPreset === 'last_month'
      ? (() => {
          const prev = new Date(fromDate)
          prev.setMonth(prev.getMonth() - 1)
          return `${MONTH_LABELS[prev.getMonth() + 1]} ${prev.getFullYear()}`
        })()
      : `${summary.period_from}_${summary.period_to}`
  anchor.download = `Utilisasi_Armada_${filterLabel.replace(' ', '_')}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
