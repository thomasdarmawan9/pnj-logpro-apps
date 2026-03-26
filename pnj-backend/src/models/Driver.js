'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Driver = sequelize.define('Driver', {
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
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },
    sim_number: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },
    sim_expired_at: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type:         DataTypes.STRING(10),
      defaultValue: 'active',
      validate:     { isIn: [['active', 'inactive']] },
    },
  }, {
    tableName: 'drivers',
    paranoid:  true,
  })

  return Driver
}
