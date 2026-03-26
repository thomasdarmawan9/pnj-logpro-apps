'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define('SystemSetting', {
    key: {
      type:       DataTypes.STRING(50),
      primaryKey: true,
    },
    value: {
      type:      DataTypes.TEXT,
      allowNull: false,
    },
  }, {
    tableName:  'system_settings',
    paranoid:   false,
    timestamps: false,
  })

  return SystemSetting
}
