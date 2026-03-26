'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const StockReceipt = sequelize.define('StockReceipt', {
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
    receipt_number: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      unique:    true,
    },
    receipt_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    supplier_name: {
      type:      DataTypes.STRING(150),
      allowNull: true,
    },
    document_number: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Contoh: SPAL 141',
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
    tableName: 'stock_receipts',
    paranoid:  true,
  })

  return StockReceipt
}
