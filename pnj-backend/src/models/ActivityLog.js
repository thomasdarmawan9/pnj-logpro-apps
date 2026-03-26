'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type:          DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey:    true,
    },
    user_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    action: {
      type:      DataTypes.STRING(50),
      allowNull: false,
    },
    module: {
      type:      DataTypes.STRING(30),
      allowNull: false,
    },
    record_uuid: {
      type:      DataTypes.UUID,
      allowNull: true,
    },
    old_data: {
      type:      DataTypes.JSONB,
      allowNull: true,
    },
    new_data: {
      type:      DataTypes.JSONB,
      allowNull: true,
    },
    ip_address: {
      type:      DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
  }, {
    tableName: 'activity_logs',
    paranoid:  false,
    updatedAt: false,
  })

  return ActivityLog
}
