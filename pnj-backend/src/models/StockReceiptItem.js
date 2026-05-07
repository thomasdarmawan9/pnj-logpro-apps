'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const StockReceiptItem = sequelize.define('StockReceiptItem', {
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
    receipt_id: {
      type:      DataTypes.BIGINT,
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
      comment:   'Kategori per baris (mis. "Batu Mangan", "Batu Chrome"). Opsional.',
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'stock_receipt_items',
    paranoid:  false,
    updatedAt: false,
  })

  return StockReceiptItem
}
