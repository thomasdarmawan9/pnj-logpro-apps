'use strict'

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.' })
    }
    next()
  }
}

const isSuperAdmin      = authorize('super_admin')
const isOpsOrAbove      = authorize('super_admin', 'admin_ops')
const isFinanceOrAbove  = authorize('super_admin', 'admin_finance')
const isAnyRole         = authorize('super_admin', 'admin_ops', 'admin_finance')

module.exports = { authorize, isSuperAdmin, isOpsOrAbove, isFinanceOrAbove, isAnyRole }
