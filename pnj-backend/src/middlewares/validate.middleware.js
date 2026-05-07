'use strict'

const { UnprocessableError } = require('../utils/AppError')

/**
 * Middleware validator Joi. Validasi `req[source]` sesuai schema,
 * kemudian overwrite `req[source]` dengan hasil cast/stripped-unknown.
 *
 *   router.post('/', validate(createSchema), controller.create)
 *   router.get('/',  validate(listSchema, 'query'), controller.list)
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly:   false,
      stripUnknown: true,
      convert:      true,
    })

    if (error) {
      const errors = error.details.map((d) => ({
        field:   d.path.join('.'),
        message: d.message,
      }))
      return next(new UnprocessableError('Validasi data gagal.', { errors }))
    }

    req[source] = value
    next()
  }
}

module.exports = { validate }
