'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const PdfJob = sequelize.define('PdfJob', {
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
    job_type: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      validate:  { isIn: [['surat_jalan', 'invoice']] },
    },
    record_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    status: {
      type:         DataTypes.STRING(15),
      defaultValue: 'pending',
      validate:     { isIn: [['pending', 'processing', 'done', 'failed']] },
    },
    file_path: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
    error_message: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    requested_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    processed_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'pdf_jobs',
    paranoid:  false,
    updatedAt: false,
  })

  return PdfJob
}
