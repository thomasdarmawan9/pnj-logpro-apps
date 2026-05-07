'use strict'

const Joi = require('joi')

// ── Aging AR ───────────────────────────────────────────────────────────────
const AGING_BUCKETS = ['current', '1-30', '31-60', '61-90', '>90']

const agingARQuery = Joi.object({
  customer_id: Joi.alternatives().try(
    Joi.number().integer().min(1),
    Joi.string().valid('all'),
  ).default('all'),
  bucket: Joi.string().valid(...AGING_BUCKETS, 'all').default('all'),
  period_from: Joi.date().iso(),
  period_to:   Joi.date().iso(),
  search:      Joi.string().trim().allow('', null).default(''),
  as_of:       Joi.date().iso(),
})

const agingARIdParam = Joi.object({
  id: Joi.number().integer().min(1).required().messages({
    'number.base':  'Parameter id harus angka.',
    'any.required': 'Parameter id wajib ada.',
  }),
})

// ── Profit & Loss ──────────────────────────────────────────────────────────
const PERIOD_PRESETS_PL  = ['this_month', 'this_quarter', '6_months', 'custom']
const PROFITABILITY      = ['all', 'profit', 'loss', 'breakeven', 'no_data']
const PROJECT_STATUSES   = ['all', 'active', 'completed', 'on_hold']

const profitLossQuery = Joi.object({
  period_preset: Joi.string().valid(...PERIOD_PRESETS_PL).default('this_month'),
  period_from:   Joi.date().iso(),
  period_to:     Joi.date().iso(),
  customer_id:   Joi.alternatives().try(
    Joi.number().integer().min(1),
    Joi.string().valid('all'),
  ).default('all'),
  project_status: Joi.string().valid(...PROJECT_STATUSES).default('all'),
  profitability:  Joi.string().valid(...PROFITABILITY).default('all'),
  include_details: Joi.boolean().default(false),
}).custom((val, helpers) => {
  if (val.period_preset === 'custom' && (!val.period_from || !val.period_to)) {
    return helpers.error('any.custom', {
      message: 'period_from dan period_to wajib diisi untuk preset custom.',
    })
  }
  return val
}).messages({ 'any.custom': '{{#message}}' })

// ── Fleet Utilization ──────────────────────────────────────────────────────
const PERIOD_PRESETS_UTIL = ['this_month', 'last_month', 'custom']
const FLEET_CATEGORIES    = ['all', 'truck', 'trailer', 'family_car', 'heavy_equipment', 'other']
const FLEET_STATUSES      = ['all', 'active', 'inactive', 'sold']

const fleetUtilizationQuery = Joi.object({
  period_preset: Joi.string().valid(...PERIOD_PRESETS_UTIL).default('this_month'),
  period_from:   Joi.date().iso(),
  period_to:     Joi.date().iso(),
  category:      Joi.string().valid(...FLEET_CATEGORIES).default('all'),
  status:        Joi.string().valid(...FLEET_STATUSES).default('all'),
}).custom((val, helpers) => {
  if (val.period_preset === 'custom' && (!val.period_from || !val.period_to)) {
    return helpers.error('any.custom', {
      message: 'period_from dan period_to wajib diisi untuk preset custom.',
    })
  }
  return val
}).messages({ 'any.custom': '{{#message}}' })

// ── Audit Trail ────────────────────────────────────────────────────────────
const PERIOD_PRESETS_AT = ['today', 'yesterday', 'this_week', 'this_month', 'all', 'custom']
const AUDIT_MODULES     = ['all', 'surat_jalan', 'invoice', 'stok', 'auth', 'master', 'settings']
const AUDIT_ACTIONS = [
  'all',
  // Surat Jalan
  'create_sj', 'update_sj', 'assign_sj', 'deliver_sj', 'void_sj',
  // Invoice
  'create_invoice', 'update_invoice', 'send_invoice', 'mark_outstanding',
  'record_payment', 'void_invoice', 'attach_sj', 'detach_sj',
  // PDF (cross-cutting)
  'generate_pdf',
  // Stock
  'stock_in', 'stock_out', 'update_stock_receipt', 'delete_stock_receipt',
  'update_stock_disbursement', 'delete_stock_disbursement',
  // Auth
  'login', 'logout', 'change_password',
  // User management
  'create_user', 'update_user', 'toggle_user', 'unlock_user',
  'delete_user', 'reset_password',
  // Master data
  'create_customer', 'update_customer', 'delete_customer',
  'create_project', 'update_project', 'delete_project',
  'create_fleet', 'update_fleet', 'delete_fleet',
  'create_driver', 'update_driver', 'delete_driver',
  'create_stock_item', 'update_stock_item', 'toggle_stock_item', 'delete_stock_item',
  // Settings
  'update_setting', 'upload_logo', 'delete_logo',
]

const auditTrailQuery = Joi.object({
  search:        Joi.string().trim().allow('', null).default(''),
  user_id:       Joi.alternatives().try(
    Joi.number().integer().min(1),
    Joi.string().valid('all'),
  ).default('all'),
  module:        Joi.string().valid(...AUDIT_MODULES).default('all'),
  action:        Joi.string().valid(...AUDIT_ACTIONS).default('all'),
  period_preset: Joi.string().valid(...PERIOD_PRESETS_AT).default('all'),
  period_from:   Joi.date().iso(),
  period_to:     Joi.date().iso(),
  page:          Joi.number().integer().min(1).default(1),
  perPage:       Joi.number().integer().min(1).max(200).default(50),
}).custom((val, helpers) => {
  if (val.period_preset === 'custom' && (!val.period_from || !val.period_to)) {
    return helpers.error('any.custom', {
      message: 'period_from dan period_to wajib diisi untuk preset custom.',
    })
  }
  return val
}).messages({ 'any.custom': '{{#message}}' })

module.exports = {
  AGING_BUCKETS,
  PERIOD_PRESETS_PL,
  PROFITABILITY,
  PROJECT_STATUSES,
  PERIOD_PRESETS_UTIL,
  FLEET_CATEGORIES,
  FLEET_STATUSES,
  PERIOD_PRESETS_AT,
  AUDIT_MODULES,
  AUDIT_ACTIONS,
  agingARQuery,
  agingARIdParam,
  profitLossQuery,
  fleetUtilizationQuery,
  auditTrailQuery,
}
