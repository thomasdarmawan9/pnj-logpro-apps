'use strict'

const { Op } = require('sequelize')
const { PdfJob } = require('../models')

function findByUuid(uuid, options = {}) {
  return PdfJob.findOne({ where: { uuid }, ...options })
}

function findById(id, options = {}) {
  return PdfJob.findByPk(id, options)
}

/**
 * Semua jobs untuk record tertentu (semua status). Dipakai untuk replace-last
 * supaya history failed/done tidak menumpuk.
 */
function findAllByRecord(jobType, recordId, options = {}) {
  return PdfJob.findAll({
    where: {
      job_type:  jobType,
      record_id: recordId,
    },
    order: [['created_at', 'DESC']],
    ...options,
  })
}

/**
 * Cek apakah ada job yang masih pending/processing untuk record ini.
 * Kalau ada → request generate baru ditolak supaya tidak race dengan worker.
 */
function findInFlightByRecord(jobType, recordId, options = {}) {
  return PdfJob.findAll({
    where: {
      job_type:  jobType,
      record_id: recordId,
      status:    { [Op.in]: ['pending', 'processing'] },
    },
    order: [['created_at', 'DESC']],
    ...options,
  })
}

function findLatestDoneByRecord(jobType, recordId, options = {}) {
  return PdfJob.findOne({
    where: {
      job_type:  jobType,
      record_id: recordId,
      status:    'done',
    },
    order: [['completed_at', 'DESC'], ['created_at', 'DESC']],
    ...options,
  })
}

module.exports = {
  findByUuid,
  findById,
  findAllByRecord,
  findInFlightByRecord,
  findLatestDoneByRecord,
}
