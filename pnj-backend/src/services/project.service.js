'use strict'

const { Op } = require('sequelize')

const {
  sequelize,
  Project,
  Customer,
  DeliveryOrder,
  Invoice,
} = require('../models')
const repo       = require('../repositories/project.repository')
const customerRepo = require('../repositories/customer.repository')
const { NotFoundError } = require('../utils/AppError')
const { generateProjectCode } = require('../utils/numberGenerator')

async function list({ page, limit, search, status, customer_uuid }) {
  let customerId = null
  if (customer_uuid) {
    const c = await customerRepo.findByUuid(customer_uuid, { attributes: ['id'] })
    if (!c) return { rows: [], count: 0 }
    customerId = c.id
  }
  const { rows, count } = await repo.list({ page, limit, search, status, customerId })
  return { rows, count }
}

async function getByUuid(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Project tidak ditemukan.')
  return item
}

async function create(payload, actor) {
  return sequelize.transaction(async (t) => {
    const customer = await Customer.findOne({
      where: { uuid: payload.customer_uuid },
      transaction: t,
    })
    if (!customer) throw new NotFoundError('Customer tidak ditemukan.')

    const code = await generateProjectCode(t)

    const project = await Project.create({
      customer_id:     customer.id,
      code,
      name:            payload.name,
      contract_number: payload.contract_number,
      description:     payload.description || null,
      start_date:      payload.start_date,
      end_date:        payload.end_date || null,
      status:          payload.status || 'active',
      created_by:      actor?.id || null,
    }, { transaction: t })

    return repo.findByUuid(project.uuid, { transaction: t })
  })
}

async function update(uuid, payload) {
  return sequelize.transaction(async (t) => {
    const item = await Project.findOne({ where: { uuid }, transaction: t })
    if (!item) throw new NotFoundError('Project tidak ditemukan.')

    const updates = { ...payload }
    if (payload.customer_uuid) {
      const customer = await Customer.findOne({ where: { uuid: payload.customer_uuid }, transaction: t })
      if (!customer) throw new NotFoundError('Customer tidak ditemukan.')
      updates.customer_id = customer.id
      delete updates.customer_uuid
    }
    await item.update(updates, { transaction: t })

    return repo.findByUuid(item.uuid, { transaction: t })
  })
}

async function remove(uuid) {
  const item = await Project.findOne({ where: { uuid } })
  if (!item) throw new NotFoundError('Project tidak ditemukan.')
  await item.destroy()
}

async function summary(uuid) {
  const project = await repo.findByUuid(uuid)
  if (!project) throw new NotFoundError('Project tidak ditemukan.')

  const [sjStats, invoiceStats] = await Promise.all([
    DeliveryOrder.findAll({
      where: { project_id: project.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      ],
      group: ['status'],
      raw: true,
    }),
    Invoice.findAll({
      where: { project_id: project.id, status: { [Op.ne]: 'void' } },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')),             'total_invoice'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_amount')), 0), 'total_amount'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('paid_amount')),  0), 'total_paid'],
      ],
      raw: true,
    }),
  ])

  const sjByStatus = Object.fromEntries(sjStats.map((r) => [r.status, Number(r.total)]))
  const inv = invoiceStats[0] || {}
  const totalAmount = Number(inv.total_amount || 0)
  const totalPaid   = Number(inv.total_paid   || 0)

  return {
    project,
    sj: {
      draft:     sjByStatus.draft     || 0,
      assigned:  sjByStatus.assigned  || 0,
      delivered: sjByStatus.delivered || 0,
      void:      sjByStatus.void      || 0,
      total:     Object.values(sjByStatus).reduce((a, b) => a + b, 0),
    },
    invoice: {
      total_invoice:  Number(inv.total_invoice || 0),
      total_amount:   totalAmount,
      total_paid:     totalPaid,
      outstanding:    totalAmount - totalPaid,
    },
  }
}

module.exports = { list, getByUuid, create, update, remove, summary }
