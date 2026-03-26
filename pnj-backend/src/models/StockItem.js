'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const StockItem = sequelize.define('StockItem', {
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
    code: {
      type:      DataTypes.STRING(30),
      allowNull: false,
      unique:    true,
    },
    name: {
      type:      DataTypes.STRING(150),
      allowNull: false,
    },
    category: {
      type:      DataTypes.STRING(50),
      allowNull: true,
    },
    unit: {
      type:      DataTypes.STRING(20),
      allowNull: false,
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
    },
    current_stock: {
      type:         DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment:      'Running balance — diupdate setiap transaksi',
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'stock_items',
    paranoid:  true,
  })

  return StockItem
}
