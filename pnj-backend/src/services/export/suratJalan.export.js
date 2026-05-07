'use strict'

const sjService = require('../suratJalan.service')
const { newWorkbook, addSheet, streamWorkbook, FMT } = require('./xlsxRenderer')

const STATUS_LABEL = {
  draft:     'Draft',
  assigned:  'Assigned',
  delivered: 'Delivered',
  void:      'Void',
}

/**
 * Export daftar Surat Jalan ke .xlsx.
 *
 * @param {object} filters — sama dengan listSJQuery
 * @param {Response} res
 */
async function exportXlsx(filters, res) {
  // Ambil semua data sesuai filter (cap 5000 untuk safety).
  const allRows = []
  let page = 1
  const limit = 200
  for (;;) {
    const { rows } = await sjService.list({ ...filters, page, limit })
    allRows.push(...rows.map(r => r.get ? r.get({ plain: true }) : r))
    if (rows.length < limit || allRows.length >= 5000) break
    page++
  }

  const wb = newWorkbook({ title: 'Daftar Surat Jalan' })

  const meta = [
    ['Tanggal Export', new Date()],
    ['Total Baris',    allRows.length],
  ]
  if (filters.search)        meta.push(['Filter Search', filters.search])
  if (filters.status && filters.status !== 'all') meta.push(['Status', filters.status])
  if (filters.from || filters.to) meta.push(['Periode', `${filters.from || '-'} → ${filters.to || '-'}`])

  const columns = [
    { header: 'No. SJ',          key: 'sj_number',     width: 18, align: 'left' },
    { header: 'Tanggal',          key: 'sj_date',        width: 13, align: 'center', format: FMT.DATE_ID },
    { header: 'Customer',         key: 'customer',       width: 30 },
    { header: 'Project',          key: 'project',        width: 28 },
    { header: 'Asal',             key: 'origin',         width: 18 },
    { header: 'Tujuan',           key: 'destination',    width: 18 },
    { header: 'Armada',           key: 'fleet',          width: 22 },
    { header: 'Driver',           key: 'driver',         width: 18 },
    { header: 'Muatan',           key: 'cargo',          width: 30 },
    { header: 'Status',           key: 'status',         width: 12, align: 'center' },
    { header: 'Invoice',          key: 'invoice_number', width: 14, align: 'center' },
    { header: 'Biaya Operasional', key: 'operational_cost', width: 18, align: 'right', format: FMT.IDR },
  ]

  const rows = allRows.map(sj => {
    const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
    const fleetLabel = fleetIsTbd
      ? 'TBD'
      : `${sj.fleet?.name || ''} (${sj.fleet?.plate_number || ''})`.trim()
    return {
      sj_number:        sj.sj_number,
      sj_date:          sj.sj_date ? new Date(sj.sj_date) : null,
      customer:         sj.customer?.name || '-',
      project:          sj.project ? `${sj.project.code} — ${sj.project.name}` : '-',
      origin:           sj.origin || '-',
      destination:      sj.destination || '-',
      fleet:            fleetLabel,
      driver:           sj.driver?.name || sj.driver_name_manual || '-',
      cargo:            sj.cargo_description || '-',
      status:           STATUS_LABEL[sj.status] || sj.status,
      invoice_number:   sj.invoice?.invoice_number || '-',
      operational_cost: Number(sj.operational_cost || 0),
    }
  })

  const totalCost = rows.reduce((s, r) => s + r.operational_cost, 0)

  addSheet(wb, 'Surat Jalan', {
    title:    'DAFTAR SURAT JALAN',
    subtitle: 'PT. Pelangi Nuansa Jaya',
    meta,
    columns,
    rows,
    summary: [
      ['Total Biaya Operasional', totalCost, { format: FMT.IDR }],
    ],
  })

  const filename = `surat_jalan_${new Date().toISOString().slice(0, 10)}.xlsx`
  await streamWorkbook(wb, res, filename)
}

module.exports = { exportXlsx }
