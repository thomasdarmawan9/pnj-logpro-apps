'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
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
    user_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    token_hash: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      unique:    true,
      comment:   'SHA-256 hash dari refresh token',
    },
    expires_at: {
      type:      DataTypes.DATE,
      allowNull: false,
    },
    is_revoked: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ip_address: {
      type:      DataTypes.STRING(45),
      allowNull: true,
    },
  }, {
    tableName: 'refresh_tokens',
    paranoid:  false,
    updatedAt: false,
  })

  return RefreshToken
}
