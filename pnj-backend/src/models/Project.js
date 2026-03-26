'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
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
    customer_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    code: {
      type:      DataTypes.STRING(30),
      allowNull: false,
      unique:    true,
      comment:   'Auto-generate: PRJ-YYYY-NNN',
    },
    name: {
      type:      DataTypes.STRING(150),
      allowNull: false,
    },
    contract_number: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      comment:   'Nomor kontrak resmi — wajib, tampil di header invoice',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    start_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type:         DataTypes.STRING(15),
      defaultValue: 'active',
      validate:     { isIn: [['active', 'completed', 'on_hold']] },
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'projects',
    paranoid:  true,
  })

  return Project
}
