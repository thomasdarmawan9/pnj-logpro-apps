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
    qty: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },
    unit: {
      type:         DataTypes.STRING(20),
      defaultValue: 'Unit',
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
  }, {
    tableName: 'invoice_items',
    paranoid:  false,
  })

  return InvoiceItem
}
