'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  normalizeIdempotencyKey,
  hashIdempotencyPayload,
  assertIdempotencyMatch,
} = require('../src/utils/idempotency')

test('idempotency key dinormalisasi dan key kosong tetap backward-compatible', () => {
  assert.equal(normalizeIdempotencyKey(undefined), null)
  assert.equal(normalizeIdempotencyKey(''), null)
  assert.equal(
    normalizeIdempotencyKey(' 550E8400-E29B-41D4-A716-446655440000 '),
    '550e8400-e29b-41d4-a716-446655440000',
  )
})

test('idempotency key non-UUID ditolak', () => {
  assert.throws(
    () => normalizeIdempotencyKey('invoice-123'),
    error => error.statusCode === 400 && error.code === 'INVALID_IDEMPOTENCY_KEY',
  )
})

test('hash payload stabil walaupun urutan key object berbeda', () => {
  const first = {
    customer_id: 12,
    items: [{ qty: 1, unit_price: 250000 }],
    notes: null,
  }
  const reordered = {
    notes: null,
    items: [{ unit_price: 250000, qty: 1 }],
    customer_id: 12,
  }

  assert.equal(hashIdempotencyPayload(first), hashIdempotencyPayload(reordered))
  assert.notEqual(
    hashIdempotencyPayload(first),
    hashIdempotencyPayload({ ...first, customer_id: 13 }),
  )
})

test('retry hanya diterima untuk user dan payload yang sama', () => {
  const payloadHash = hashIdempotencyPayload({ customer_id: 12 })
  const invoice = {
    created_by: 7,
    idempotency_payload_hash: payloadHash,
  }

  assert.doesNotThrow(() => assertIdempotencyMatch(invoice, { actorId: 7, payloadHash }))
  assert.throws(
    () => assertIdempotencyMatch(invoice, { actorId: 8, payloadHash }),
    error => error.statusCode === 409 && error.code === 'IDEMPOTENCY_KEY_REUSED',
  )
  assert.throws(
    () => assertIdempotencyMatch(invoice, {
      actorId: 7,
      payloadHash: hashIdempotencyPayload({ customer_id: 13 }),
    }),
    error => error.statusCode === 409 && error.code === 'IDEMPOTENCY_KEY_REUSED',
  )
})
