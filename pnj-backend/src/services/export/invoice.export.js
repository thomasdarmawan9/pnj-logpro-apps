'use strict'

const invoiceService = require('../invoice.service')
const { newWorkbook, addSheet, streamWorkbook, FMT } = require('./xlsxRenderer')

const STATUS_LABEL = {
  draft:       'Draft',
  sent:        'Sent',
  outstanding: 'Outstanding',
  paid:        'Paid',
  void:        'Void',
}

async function exportXlsx(filters, res) {
  const allRows = []
  let page = 1
  const limit = 200
  for (;;) {
    const { rows } = await invoiceService.list({ ...filters, page, limit })
    allRows.push(...rows.map(r => r.get ? r.get({ plain: true }) : r))
    if (rows.length < limit || allRows.length >= 5000) break
    page++
  }

  const wb = newWorkbook({ title: 'Daftar Invoice' })

  const meta = [
    ['Tanggal Export', new Date()],
    ['Total Baris',    allRows.length],
  ]
  if (filters.search) meta.push(['Filter Search', filters.search])
  if (filters.status && filters.status !== 'all') meta.push(['Status', filters.status])
  if (filters.from || filters.to) meta.push(['Periode', `${filters.from || '-'} → ${filters.to || '-'}`])

  const columns = [
    { header: 'No. Invoice',     key: 'invoice_number', width: 14, align: 'left' },
    { header: 'Tanggal',          key: 'invoice_date',   width: 13, align: 'center', format: FMT.DATE_ID },
    { header: 'Jatuh Tempo',      key: 'due_date',       width: 13, align: 'center', format: FMT.DATE_ID },
    { header: 'Customer',         key: 'customer',       width: 30 },
    { header: 'Project',          key: 'project',        width: 22 },
    { header: 'Subtotal',         key: 'subtotal',       width: 16, align: 'right', format: FMT.IDR },
    { header: 'PPN',              key: 'tax',            width: 14, align: 'right', format: FMT.IDR },
    { header: 'PPh',              key: 'pph',            width: 14, align: 'right', format: FMT.IDR },
    { header: 'Total',            key: 'total',          width: 16, align: 'right', format: FMT.IDR },
    { header: 'Dibayar',          key: 'paid',           width: 16, align: 'right', format: FMT.IDR },
    { header: 'Sisa',             key: 'remaining',      width: 16, align: 'right', format: FMT.IDR },
    { header: 'Status',           key: 'status',         width: 12, align: 'center' },
  ]

  const rows = allRows.map(inv => {
    const total     = Number(inv.total_amount || 0)
    const paid      = Number(inv.paid_amount  || 0)
    return {
      invoice_number: inv.invoice_number,
      invoice_date:   inv.invoice_date ? new Date(inv.invoice_date) : null,
      due_date:       inv.due_date ? new Date(inv.due_date) : null,
      customer:       inv.customer?.name || '-',
      project:        inv.project?.code || '-',
      subtotal:       Number(inv.subtotal_amount || 0),
      tax:            Number(inv.tax_amount || 0),
      pph:            Number(inv.pph_amount || 0),
      total,
      paid,
      remaining:      Math.max(0, total - paid),
      status:         STATUS_LABEL[inv.status] || inv.status,
    }
  })

  const sumTotal     = rows.reduce((s, r) => s + r.total, 0)
  const sumPaid      = rows.reduce((s, r) => s + r.paid,  0)
  const sumRemaining = rows.reduce((s, r) => s + r.remaining, 0)

  addSheet(wb, 'Invoice', {
    title:    'DAFTAR INVOICE',
    subtitle: 'PT. Pelangi Nuansa Jaya',
    meta,
    columns,
    rows,
    summary: [
      ['Total Tagihan',    sumTotal,     { format: FMT.IDR }],
      ['Total Dibayar',    sumPaid,      { format: FMT.IDR }],
      ['Total Outstanding', sumRemaining, { format: FMT.IDR }],
    ],
  })

  const filename = `invoice_${new Date().toISOString().slice(0, 10)}.xlsx`
  await streamWorkbook(wb, res, filename)
}

module.exports = { exportXlsx }
