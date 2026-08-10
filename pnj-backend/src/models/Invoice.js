'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type:          DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey:    true,
    },
    uuid: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
      unique:       true,
    },
    invoice_number: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      unique:    true,
    },
    idempotency_key: {
      type:      DataTypes.UUID,
      allowNull: true,
      unique:    true,
      comment:   'Kunci unik dari client untuk mencegah invoice ganda saat request create diulang.',
    },
    idempotency_payload_hash: {
      type:      DataTypes.STRING(64),
      allowNull: true,
      comment:   'SHA-256 payload create untuk mendeteksi pemakaian ulang key dengan data berbeda.',
    },
    project_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    customer_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    invoice_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    due_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    settlement_date: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Tanggal pembayaran yang membuat invoice berstatus lunas.',
    },
    delivery_date: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Tanggal pengiriman manual untuk invoice jasa pengiriman; tampil di PDF.',
    },
    service_type: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'delivery',
      validate:     { isIn: [['delivery', 'rental', 'other']] },
      comment:      'delivery = jasa pengiriman, rental = jasa penyewaan, other = jasa lainnya',
    },
    custom_service_name: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Nama jasa manual untuk service_type=other',
    },
    delivery_pricing_mode: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'shipment',
      validate:     { isIn: [['shipment', 'item']] },
      comment:      'shipment = satu harga per pengiriman, item = harga per barang/muatan',
    },
    subtotal_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    tax_percent: {
      type:         DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    tax_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    pph_percent: {
      type:         DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'Persentase PPh — dikurangi dari total invoice',
    },
    pph_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'subtotal × pph_percent / 100',
    },
    insurance_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment:      'Nominal asuransi — ditambahkan setelah PPN/PPh, tidak masuk DPP',
    },
    total_amount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment:   'Netto = subtotal + tax_amount - pph_amount',
    },
    paid_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    status: {
      type:         DataTypes.STRING(15),
      defaultValue: 'draft',
      validate:     { isIn: [['draft', 'sent', 'outstanding', 'paid', 'void']] },
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    origin: {
      type:      DataTypes.STRING(200),
      allowNull: true,
      comment:   'Lokasi asal untuk invoice pengiriman tanpa/di luar SJ',
    },
    destination: {
      type:      DataTypes.STRING(200),
      allowNull: true,
      comment:   'Lokasi tujuan untuk invoice pengiriman tanpa/di luar SJ',
    },
    cargo_description: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Deskripsi muatan global invoice pengiriman',
    },
    manual_sj_numbers: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Nomor SJ manual untuk invoice pengiriman jika tidak dikaitkan ke SJ database.',
    },
    sent_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    void_reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    lampiran_paths: {
      type:      DataTypes.ARRAY(DataTypes.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran tambahan relatif terhadap UPLOAD_DIR',
    },
    payment_method: {
      type:         DataTypes.STRING(20),
      defaultValue: 'transfer',
      allowNull:    false,
    },
    bank_account_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'invoices',
    paranoid:  true,
  })

  return Invoice
}
