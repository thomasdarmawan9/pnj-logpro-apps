'use strict'

const { createHash } = require('crypto')
const { BadRequestError, ConflictError } = require('./AppError')

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeIdempotencyKey(value) {
  if (value === undefined || value === null || value === '') return null

  const key = String(value).trim().toLowerCase()
  if (!UUID_PATTERN.test(key)) {
    throw new BadRequestError('Header Idempotency-Key harus berupa UUID yang valid.', {
      code: 'INVALID_IDEMPOTENCY_KEY',
    })
  }
  return key
}

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`

  const entries = Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
  return `{${entries.join(',')}}`
}

function hashIdempotencyPayload(payload) {
  return createHash('sha256').update(stableSerialize(payload)).digest('hex')
}

function assertIdempotencyMatch(invoice, { actorId, payloadHash }) {
  if (
    invoice.created_by !== null &&
    invoice.created_by !== undefined &&
    actorId !== null &&
    actorId !== undefined &&
    Number(invoice.created_by) !== Number(actorId)
  ) {
    throw new ConflictError('Idempotency key sudah digunakan oleh pengguna lain.', {
      code: 'IDEMPOTENCY_KEY_REUSED',
    })
  }

  if (invoice.idempotency_payload_hash !== payloadHash) {
    throw new ConflictError(
      'Invoice dari percobaan sebelumnya sudah tersimpan, tetapi data form sekarang berbeda. Periksa daftar invoice sebelum membuat invoice baru.',
      {
        code: 'IDEMPOTENCY_KEY_REUSED',
      },
    )
  }
}

module.exports = {
  normalizeIdempotencyKey,
  hashIdempotencyPayload,
  assertIdempotencyMatch,
  stableSerialize,
}
