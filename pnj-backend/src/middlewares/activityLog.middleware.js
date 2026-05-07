'use strict'

const { ActivityLog } = require('../models')
const logger          = require('../utils/logger')

const SENSITIVE_KEY_PATTERNS = [
  'password', 'access_token', 'refresh_token', 'token',
]

const MAX_DEPTH         = 3
const MAX_STRING_LENGTH = 500
const MAX_LOG_SIZE      = 50_000  // 50KB safety cap

/**
 * Strip field sensitif (password, tokens) secara rekursif dengan depth limit.
 */
function sanitizeData(value, depth = 0) {
  if (value === null || value === undefined)    return value
  if (depth > MAX_DEPTH)                        return '<truncated>'
  if (value instanceof Date)                    return value.toISOString()
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) + '…' : value
  }
  if (typeof value !== 'object')                return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map(v => sanitizeData(v, depth + 1))
  }
  const result = {}
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERNS.some(p => k.toLowerCase().includes(p))) continue
    result[k] = sanitizeData(v, depth + 1)
  }
  return result
}

/**
 * Default record_label extractor — coba ambil dari field yang umum dipakai
 * sebagai identifier ringkas record.
 */
function defaultLabelExtractor(data) {
  if (!data || typeof data !== 'object') return null
  return data.sj_number
      || data.invoice_number
      || data.receipt_number
      || data.disbursement_number
      || data.code
      || data.email
      || data.name
      || data.user?.email
      || data.user?.name
      || null
}

function defaultUuidExtractor(data) {
  if (!data || typeof data !== 'object') return null
  return data.uuid || data.user?.uuid || null
}

/**
 * Middleware activity log. Wrap res.json supaya bisa log setelah response
 * sukses (2xx). Async fire-and-forget — tidak block response.
 *
 * @param {string} action — sesuai enum di validators/reports.validator.js#AUDIT_ACTIONS
 * @param {string} module — surat_jalan|invoice|stok|auth|master|settings
 * @param {object} options
 *   - userExtractor:  (body, req) => userId — fallback kalau req.user belum ada (login)
 *   - labelExtractor: (body, req) => string|null — override default label
 *   - uuidExtractor:  (body, req) => string|null — override default record_uuid
 *   - skipBody:       boolean — kalau true, new_data tidak di-log (mis. delete)
 */
function logActivity(action, module, options = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = function (body) {
      // Hanya log untuk response sukses (2xx).
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return originalJson(body)
      }

      try {
        const data = body?.data
        const userId = req.user?.id
                     ?? options.userExtractor?.(body, req)
                     ?? null
        if (!userId) return originalJson(body)

        const recordUuid = options.uuidExtractor
          ? options.uuidExtractor(body, req)
          : defaultUuidExtractor(data)

        const recordLabel = options.labelExtractor
          ? options.labelExtractor(body, req)
          : defaultLabelExtractor(data)

        let newData = options.skipBody ? null : sanitizeData(data)
        if (newData) {
          const json = JSON.stringify(newData)
          if (json && json.length > MAX_LOG_SIZE) newData = '<too_large>'
        }

        const payload = {
          user_id:      userId,
          action,
          module,
          record_uuid:  recordUuid,
          record_label: recordLabel,
          old_data:     req.activityOldData || null,
          new_data:     newData,
          ip_address:   req.ip || req.connection?.remoteAddress || null,
          user_agent:   (req.get && req.get('user-agent')) || null,
        }

        // Fire-and-forget — tidak block response.
        ActivityLog.create(payload).catch((err) => {
          logger.error(`[activityLog] gagal create log "${action}":`, err.message)
        })
      } catch (err) {
        logger.error('[activityLog] error saat persiapan log:', err.message)
      }

      return originalJson(body)
    }

    next()
  }
}

module.exports = {
  logActivity,
  sanitizeData,
  defaultLabelExtractor,
  defaultUuidExtractor,
}
