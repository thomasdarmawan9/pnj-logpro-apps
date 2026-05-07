'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
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
    payment_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    method: {
      type:      DataTypes.STRING(10),
      allowNull: false,
      validate:  { isIn: [['transfer', 'cash', 'check']] },
    },
    proof_path: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    is_down_payment: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'TRUE = uang muka (DP). Maksimal 1 DP per invoice.',
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'payments',
    paranoid:  false,
    updatedAt: false,
  })

  return Payment
}
