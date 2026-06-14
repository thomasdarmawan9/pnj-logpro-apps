'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const InvoiceItem = sequelize.define('InvoiceItem', {
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
    invoice_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    fleet_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    driver_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    driver_name_manual: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    fleet_label: {
      type:      DataTypes.STRING(150),
      allowNull: false,
      comment:   'Label kendaraan di invoice — bisa diedit manual',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    period_start: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    period_end: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    rental_duration_years: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    },
    rental_duration_months: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    },
    rental_duration_days: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    },
    rental_duration_hours: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    },
    qty: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },
    unit: {
      type:         DataTypes.STRING(20),
      defaultValue: 'Unit',
    },
    cargo_qty: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment:   'Jumlah muatan/barang. Terpisah dari qty tagihan invoice.',
    },
    cargo_unit: {
      type:      DataTypes.STRING(30),
      allowNull: true,
      comment:   'Satuan muatan/barang. Terpisah dari unit tagihan invoice.',
    },
    cargo_weight: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment:   'Berat muatan/barang untuk invoice pengiriman.',
    },
    cargo_volume: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment:   'Volume muatan/barang untuk invoice pengiriman.',
    },
    cargo_notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Catatan muatan/barang dari SJ atau input manual invoice.',
    },
    unit_price: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    subtotal: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment:   'qty × unit_price',
    },
    sort_order: {
      type:         DataTypes.SMALLINT,
      defaultValue: 0,
    },
    source_sj_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
      comment:   'Null = item manual. Non-null = item disalin dari SJ saat attach.',
    },
  }, {
    tableName: 'invoice_items',
    paranoid:  false,
  })

  return InvoiceItem
}
