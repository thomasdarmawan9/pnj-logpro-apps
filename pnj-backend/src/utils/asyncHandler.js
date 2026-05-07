'use strict'

/**
 * Wrap async Express handler supaya exception otomatis diteruskan ke
 * errorHandler global tanpa perlu try/catch berulang.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = asyncHandler
