'use strict'

const { ActivityLog } = require('../models')
const logger          = require('../utils/logger')

function logActivity(action, module) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = function (body) {
      // Jalankan logging secara async setelah response terkirim
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const logData = {
          user_id:     req.user.id,
          action,
          module,
          record_uuid: body?.data?.uuid || null,
          old_data:    req.oldData || null,
          new_data:    body?.data   || null,
          ip_address:  req.ip || req.connection?.remoteAddress || null,
          user_agent:  req.get('user-agent') || null,
        }

        ActivityLog.create(logData).catch((err) => {
          logger.error('Gagal mencatat activity log:', err)
        })
      }

      return originalJson(body)
    }

    next()
  }
}

module.exports = { logActivity }
