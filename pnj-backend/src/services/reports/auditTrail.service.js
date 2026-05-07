'use strict'

const { Op } = require('sequelize')
const { ActivityLog, User } = require('../../models')
const { resolvePeriod, toISODate } = require('../../utils/reportPeriods')

/**
 * @param {object} filters
 *   - search, user_id, module, action
 *   - period_preset, period_from, period_to
 *   - page, perPage
 */
async function getList(filters = {}) {
  const { from: periodFrom, to: periodTo } = resolvePeriod(
    filters.period_preset,
    filters.period_from,
    filters.period_to,
  )

  const where = {}

  if (filters.module && filters.module !== 'all') where.module = filters.module
  if (filters.action && filters.action !== 'all') where.action = filters.action

  if (filters.user_id && filters.user_id !== 'all') {
    where.user_id = Number(filters.user_id)
  }

  if (periodFrom || periodTo) {
    where.created_at = {}
    if (periodFrom) where.created_at[Op.gte] = periodFrom
    if (periodTo)   where.created_at[Op.lte] = periodTo
  }

  if (filters.search) {
    const q = `%${filters.search}%`
    where[Op.or] = [
      { action:       { [Op.iLike]: q } },
      { module:       { [Op.iLike]: q } },
      { record_label: { [Op.iLike]: q } },
    ]
  }

  const page    = filters.page    || 1
  const perPage = filters.perPage || 50

  const { rows, count } = await ActivityLog.findAndCountAll({
    where,
    include: [{
      model:      User,
      as:         'user',
      attributes: ['id', 'uuid', 'name', 'role'],
      required:   false,
    }],
    order:    [['created_at', 'DESC'], ['id', 'DESC']],
    offset:   (page - 1) * perPage,
    limit:    perPage,
  })

  // Map ke shape FE: AuditLog.
  const logs = rows.map(r => {
    const plain = r.get({ plain: true })
    return {
      id:           plain.id,
      user_name:    plain.user?.name || '(unknown)',
      user_role:    plain.user?.role || '',
      action:       plain.action,
      module:       plain.module,
      record_uuid:  plain.record_uuid || null,
      record_label: plain.record_label || null,
      old_data:     plain.old_data || null,
      new_data:     plain.new_data || null,
      ip_address:   plain.ip_address || null,
      created_at:   plain.created_at ? new Date(plain.created_at).toISOString() : null,
    }
  })

  return { logs, total: count, page, perPage }
}

module.exports = { getList }
