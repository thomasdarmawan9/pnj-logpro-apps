'use strict'

function getDaysOverdue(dueDateStr) {
  const now     = new Date()
  const dueDate = new Date(dueDateStr)
  now.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
}

function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'current'
  if (daysOverdue <= 30) return '1-30'
  if (daysOverdue <= 60) return '31-60'
  if (daysOverdue <= 90) return '61-90'
  return '>90'
}

function getSIMStatus(simExpiredAt) {
  if (!simExpiredAt) {
    return { status: 'no_sim', daysLeft: null }
  }

  const now     = new Date()
  const expDate = new Date(simExpiredAt)
  now.setHours(0, 0, 0, 0)
  expDate.setHours(0, 0, 0, 0)
  const daysLeft = Math.floor((expDate - now) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0)   return { status: 'expired',       daysLeft }
  if (daysLeft <= 30) return { status: 'expiring_soon',  daysLeft }
  return               { status: 'valid',               daysLeft }
}

module.exports = { getDaysOverdue, getAgingBucket, getSIMStatus }
