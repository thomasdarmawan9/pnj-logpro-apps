'use strict'

const Joi = require('joi')

const ACTIVITY_MODULES  = ['all', 'sj', 'invoice']
const ACTIVITY_STATUSES = [
  'all',
  'DRAFT', 'ASSIGNED', 'DELIVERED', 'VOID',     // SJ statuses
  'OUTSTANDING', 'PAID',                        // Invoice statuses
  // Note: 'sent' invoice di-rebrand ke 'OUTSTANDING' di FE; OUTSTANDING di BE
  // mencakup 'sent' + 'outstanding'.
]
const ACTIVITY_PERIODS = ['all', 'this_month', 'last_month']

/**
 * GET /dashboard/summary — filter periode, modul, dan status.
 */
const summaryQuery = Joi.object({
  period: Joi.string().valid(...ACTIVITY_PERIODS).default('this_month'),
  module: Joi.string().valid(...ACTIVITY_MODULES).default('all'),
  status: Joi.string().valid(...ACTIVITY_STATUSES).default('all'),
})

/**
 * GET /dashboard/activity — combined feed SJ + Invoice.
 */
const activityQuery = Joi.object({
  module:  Joi.string().valid(...ACTIVITY_MODULES).default('all'),
  status:  Joi.string().valid(...ACTIVITY_STATUSES).default('all'),
  period:  Joi.string().valid(...ACTIVITY_PERIODS).default('this_month'),
  page:    Joi.number().integer().min(1).default(1),
  limit:   Joi.number().integer().min(1).max(100).default(10),
})

module.exports = {
  ACTIVITY_MODULES,
  ACTIVITY_STATUSES,
  ACTIVITY_PERIODS,
  summaryQuery,
  activityQuery,
}
