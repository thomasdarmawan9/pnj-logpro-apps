'use strict'

/**
 * Custom error dengan HTTP status code. Di-handle oleh errorHandler middleware
 * yang mengandalkan property `statusCode`.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, extra = {}) {
    super(message)
    this.statusCode = statusCode
    Object.assign(this, extra)
    Error.captureStackTrace?.(this, this.constructor)
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid.', extra = {}) { super(message, 400, extra) }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Tidak terautentikasi.', extra = {}) { super(message, 401, extra) }
}
class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak.', extra = {}) { super(message, 403, extra) }
}
class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan.', extra = {}) { super(message, 404, extra) }
}
class ConflictError extends AppError {
  constructor(message = 'Data konflik.', extra = {}) { super(message, 409, extra) }
}
class UnprocessableError extends AppError {
  constructor(message = 'Data tidak dapat diproses.', extra = {}) { super(message, 422, extra) }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
}
