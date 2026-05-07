'use strict'

const asyncHandler  = require('../utils/asyncHandler')
const { success }   = require('../utils/response')

const summarySvc  = require('../services/dashboard/summary.service')
const activitySvc = require('../services/dashboard/activity.service')

const getSummary = asyncHandler(async (req, res) => {
  const { period = 'this_month', module = 'all', status = 'all' } = req.query
  const data = await summarySvc.getSummary(period, module, status)
  res.json(success(data))
})

const getActivity = asyncHandler(async (req, res) => {
  const data = await activitySvc.getActivity(req.query)
  res.json(success(data))
})

module.exports = { getSummary, getActivity }
