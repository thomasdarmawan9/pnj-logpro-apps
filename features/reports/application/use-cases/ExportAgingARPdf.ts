import type { AgingARSummary } from '../../domain/entities/AgingARReport'
import { AgingBucket } from '../../domain/value-objects/AgingBucket'
import { formatDateOnly } from '@/lib/dateOnly'

function rp(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)
}

export async function exportAgingARPdf(data: AgingARSummary): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()
  const asOfLabel = formatDateOnly(data.as_of_date, { day: '2-digit', month: 'long', year: 'numeric' })
  const printedAt = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('PT. Pelangi Nuansa Jaya', pageW / 2, 14, { align: 'center' })

  doc.setFontSize(10)
  doc.text('Laporan Aging Piutang (AR)', pageW / 2, 20, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`Per Tanggal: ${asOfLabel}`, pageW / 2, 26, { align: 'center' })
  doc.text(`Dicetak: ${printedAt}`, pageW / 2, 31, { align: 'center' })

  // Garis pemisah
  doc.setDrawColor(30, 58, 30)
  doc.setLineWidth(0.5)
  doc.line(14, 34, pageW - 14, 34)

  // ── Ringkasan ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 58, 30)
  doc.text('RINGKASAN', 14, 40)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  // Hanya tampilkan customer yang punya piutang aktif (total_outstanding > 0)
  const activeCustomers = data.customers.filter(c => c.total_outstanding > 0)

  const summaryItems = [
    ['Total Piutang Aktif', rp(data.total_outstanding)],
    ['Belum Jatuh Tempo', rp(data.bucket_totals[AgingBucket.CURRENT])],
    ['1–30 Hari', rp(data.bucket_totals[AgingBucket.DAYS_1_30])],
    ['31–60 Hari', rp(data.bucket_totals[AgingBucket.DAYS_31_60])],
    ['61–90 Hari', rp(data.bucket_totals[AgingBucket.DAYS_61_90])],
    ['> 90 Hari', rp(data.bucket_totals[AgingBucket.OVER_90])],
    ['Jumlah Customer', `${activeCustomers.length} customer`],
    ['Jumlah Invoice', `${data.invoice_count} invoice`],
  ]

  const colW = (pageW - 28) / 4
  summaryItems.forEach((item, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = 14 + col * colW
    const y = 46 + row * 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 100, 100)
    doc.text(item[0], x, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(0, 0, 0)
    doc.text(item[1], x, y + 4)
  })

  // ── Tabel ─────────────────────────────────────────────────────────────────
  const tableHead = [['No', 'Customer', 'NPWP', 'Belum JT', '1–30 Hari', '31–60 Hari', '61–90 Hari', '> 90 Hari', 'Total Piutang']]

  const tableBody = activeCustomers.map((c, i) => [
    String(i + 1),
    c.customer_name,
    c.npwp || '—',
    rp(c.bucket_totals[AgingBucket.CURRENT]),
    rp(c.bucket_totals[AgingBucket.DAYS_1_30]),
    rp(c.bucket_totals[AgingBucket.DAYS_31_60]),
    rp(c.bucket_totals[AgingBucket.DAYS_61_90]),
    rp(c.bucket_totals[AgingBucket.OVER_90]),
    rp(c.total_outstanding),
  ])

  // Grand total row
  tableBody.push([
    '',
    'GRAND TOTAL',
    '',
    rp(data.bucket_totals[AgingBucket.CURRENT]),
    rp(data.bucket_totals[AgingBucket.DAYS_1_30]),
    rp(data.bucket_totals[AgingBucket.DAYS_31_60]),
    rp(data.bucket_totals[AgingBucket.DAYS_61_90]),
    rp(data.bucket_totals[AgingBucket.OVER_90]),
    rp(data.total_outstanding),
  ])

  autoTable(doc, {
    startY: 64,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
    headStyles: {
      fillColor: [30, 58, 30],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      const isLastRow = hookData.row.index === tableBody.length - 1
      // Grand total row styling
      if (isLastRow) {
        hookData.cell.styles.fillColor = [209, 250, 229]
        hookData.cell.styles.fontStyle = 'bold'
      }
      // 61-90 hari col (index 6) highlight if > 0
      if (!isLastRow && hookData.column.index === 6) {
        const raw = activeCustomers[hookData.row.index]?.bucket_totals[AgingBucket.DAYS_61_90] ?? 0
        if (raw > 0) hookData.cell.styles.fillColor = [254, 243, 199]
      }
      // >90 hari col (index 7) highlight if > 0
      if (!isLastRow && hookData.column.index === 7) {
        const raw = activeCustomers[hookData.row.index]?.bucket_totals[AgingBucket.OVER_90] ?? 0
        if (raw > 0) hookData.cell.styles.fillColor = [254, 226, 226]
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Halaman ${p} dari ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' })
    doc.text('PNJ Control — Laporan Aging Piutang (AR)', 14, doc.internal.pageSize.getHeight() - 6)
  }

  doc.save(`Aging_AR_${data.as_of_date}.pdf`)
}
