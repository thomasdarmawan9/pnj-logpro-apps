'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
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
    email: {
      type:      DataTypes.STRING(150),
      allowNull: false,
      unique:    true,
      validate:  { isEmail: true },
    },
    password: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      validate:  { isIn: [['super_admin', 'admin_ops', 'admin_finance']] },
    },
    is_active: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
    },
    login_attempt: {
      type:         DataTypes.SMALLINT,
      defaultValue: 0,
    },
    locked_until: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    last_login_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    paranoid:  true,
  })

  return User
}
