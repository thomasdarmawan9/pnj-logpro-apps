'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const StockDisbursement = sequelize.define('StockDisbursement', {
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
    disbursement_number: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      unique:    true,
    },
    disbursement_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    stock_item_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    qty: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    kategori_name: {
      type:      DataTypes.STRING(50),
      allowNull: true,
    },
    source_type: {
      type:         DataTypes.STRING(30),
      allowNull:    false,
      defaultValue: 'manual',
      validate:     { isIn: [['manual', 'sj_auto']] },
    },
    delivery_order_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
      comment:   'FK ke SJ — opsional',
    },
    sj_number_manual: {
      type:      DataTypes.STRING(50),
      allowNull: true,
    },
    invoice_number_manual: {
      type:      DataTypes.STRING(50),
      allowNull: true,
    },
    driver_name: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    vehicle_plate: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },
    destination: {
      type:      DataTypes.STRING(200),
      allowNull: true,
    },
    customer_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'stock_disbursements',
    paranoid:  true,
  })

  return StockDisbursement
}
