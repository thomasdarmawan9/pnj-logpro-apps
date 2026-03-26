'use strict'

function success(data, message = 'Berhasil.', statusCode = 200) {
  return { success: true, message, data }
}

function paginate(data, total, page, limit) {
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

function error(message, statusCode = 500, extra = {}) {
  return { success: false, message, statusCode, ...extra }
}

module.exports = { success, paginate, error }
