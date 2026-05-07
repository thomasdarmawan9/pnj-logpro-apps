'use strict'

const { BankAccount } = require('../../models')
const { NotFoundError } = require('../../utils/AppError')

async function getAll() {
  const rows = await BankAccount.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] })
  return rows.map(serialize)
}

async function create(data) {
  const row = await BankAccount.create({
    bank_name:      data.bank_name.trim(),
    account_number: data.account_number.trim(),
    account_holder: data.account_holder.trim(),
    is_active:      data.is_active !== false,
    sort_order:     data.sort_order || 0,
  })
  return serialize(row)
}

async function update(uuid, data) {
  const row = await BankAccount.findOne({ where: { uuid } })
  if (!row) throw new NotFoundError('Rekening bank tidak ditemukan.')

  const fields = {}
  if (data.bank_name      !== undefined) fields.bank_name      = data.bank_name.trim()
  if (data.account_number !== undefined) fields.account_number = data.account_number.trim()
  if (data.account_holder !== undefined) fields.account_holder = data.account_holder.trim()
  if (data.is_active      !== undefined) fields.is_active      = data.is_active
  if (data.sort_order     !== undefined) fields.sort_order     = data.sort_order

  await row.update(fields)
  return serialize(row)
}

async function remove(uuid) {
  const row = await BankAccount.findOne({ where: { uuid } })
  if (!row) throw new NotFoundError('Rekening bank tidak ditemukan.')
  await row.destroy()
}

function serialize(row) {
  return {
    id:             Number(row.id),
    uuid:           row.uuid,
    bank_name:      row.bank_name,
    account_number: row.account_number,
    account_holder: row.account_holder,
    is_active:      Boolean(row.is_active),
    sort_order:     Number(row.sort_order),
  }
}

module.exports = { getAll, create, update, remove }
