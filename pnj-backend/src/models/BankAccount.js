'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const BankAccount = sequelize.define('BankAccount', {
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
    bank_name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    account_number: {
      type:      DataTypes.STRING(50),
      allowNull: false,
    },
    account_holder: {
      type:      DataTypes.STRING(150),
      allowNull: false,
    },
    is_active: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull:    false,
    },
    sort_order: {
      type:         DataTypes.INTEGER,
      defaultValue: 0,
      allowNull:    false,
    },
  }, {
    tableName:  'bank_accounts',
    paranoid:   false,
    timestamps: true,
  })

  return BankAccount
}
