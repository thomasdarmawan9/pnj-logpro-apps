'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
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
    name: {
      type:      DataTypes.STRING(150),
      allowNull: false,
    },
    pic_name: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    phone: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type:      DataTypes.STRING(150),
      allowNull: true,
      validate:  { isEmail: true },
    },
    address: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    npwp: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },
    is_pkp: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
      comment:      'PKP = auto-suggest PPN 1.1% di invoice',
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'customers',
    paranoid:  true,
  })

  return Customer
}
