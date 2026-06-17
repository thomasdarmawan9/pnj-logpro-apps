'use strict'

const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const invoiceTemplate = require('../src/pdf/invoice.template')

const company = {
  name: 'PT. PELANGI NUANSA JAYA',
  address: 'Jl. Contoh No. 123, Jakarta',
  website: 'www.pnj.co.id',
  phone: '021-1234567',
  email: 'info@pnj.co.id',
}

const baseInvoice = {
  invoice_date: new Date(),
  status: 'sent',
  service_type: 'delivery',
  delivery_pricing_mode: 'shipment',
  origin: 'Gudang PNJ, Jl. Arteri Supadio Pontianak',
  destination: 'Lokasi PT. ATP BIO, Kubu Raya',
  customer: { name: 'PT. Contoh Customer' },
  project: { contract_number: 'KTR-001' },
  subtotal_amount: 5000000,
  tax_percent: 11,
  tax_amount: 550000,
  pph_percent: 0,
  pph_amount: 0,
  insurance_amount: 0,
  total_amount: 5550000,
  down_payment_amount: 0,
}

// 1. Invoice dengan berat + volume terisi (test sub-row divider di kolom Qty)
const weightVolumeInvoice = {
  ...baseInvoice,
  invoice_number: 'INV/2026/06/0001',
  delivery_pricing_mode: 'item',
  items: [
    {
      description: 'Semen Tiga Roda',
      qty: 12, unit: 'collie', unit_price: 250000, subtotal: 3000000,
      fleet_label: 'Pengiriman',
      cargo_qty: 12, cargo_unit: 'collie',
      cargo_weight: 210, cargo_volume: 20,
      cargo_notes: 'Hati-hati mudah pecah',
    },
    {
      description: 'Besi Beton 10mm',
      qty: 5, unit: 'batang', unit_price: 400000, subtotal: 2000000,
      fleet_label: 'Pengiriman',
      cargo_qty: 5, cargo_unit: 'batang',
      cargo_weight: 150, cargo_volume: null,  // hanya berat, tanpa volume
      cargo_notes: '',
    },
    {
      description: 'Kayu Meranti',
      qty: 3, unit: 'm3', unit_price: 0, subtotal: 0,
      fleet_label: 'Pengiriman',
      cargo_qty: 3, cargo_unit: 'm3',
      cargo_weight: null, cargo_volume: 3,    // hanya volume, tanpa berat
      cargo_notes: '',
    },
  ],
  subtotal_amount: 5000000,
}

// 2. Invoice 4 item — harus masih combo (threshold = 4)
const fourItemInvoice = {
  ...baseInvoice,
  invoice_number: 'INV/2026/06/0002',
  delivery_pricing_mode: 'item',
  items: Array.from({ length: 4 }).map((_, i) => ({
    description: `Barang ${i + 1}`,
    qty: 2, unit: 'pcs', unit_price: 500000, subtotal: 1000000,
    fleet_label: 'Pengiriman',
    cargo_qty: 2, cargo_unit: 'pcs',
    cargo_weight: 50, cargo_volume: 0.5,
  })),
  subtotal_amount: 4000000,
  total_amount: 4440000,
  tax_amount: 440000,
}

// 3. Invoice 5 item — harus pisah halaman (tidak combo)
const fiveItemInvoice = {
  ...fourItemInvoice,
  invoice_number: 'INV/2026/06/0003',
  items: Array.from({ length: 5 }).map((_, i) => ({
    description: `Barang ${i + 1}`,
    qty: 2, unit: 'pcs', unit_price: 500000, subtotal: 1000000,
    fleet_label: 'Pengiriman',
    cargo_qty: 2, cargo_unit: 'pcs',
    cargo_weight: 50, cargo_volume: 0.5,
  })),
  subtotal_amount: 5000000,
  total_amount: 5550000,
  tax_amount: 550000,
}

function generate(invoice, outFile) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  })
  const outPath = path.join(__dirname, '..', '..', 'pdfs', outFile)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const stream = fs.createWriteStream(outPath)
  doc.pipe(stream)
  invoiceTemplate.render(doc, invoice, company, { copies: 3, copyLabel: true, includeSJ: false })
  doc.end()
  stream.on('finish', () => console.log('Generated', outPath))
}

generate(weightVolumeInvoice, 'TEST_weight_volume.pdf')
generate(fourItemInvoice,     'TEST_combo_4items.pdf')
generate(fiveItemInvoice,     'TEST_split_5items.pdf')
