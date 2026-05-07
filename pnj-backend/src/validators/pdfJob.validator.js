'use strict'

const Joi = require('joi')

const sjOptionsSchema = Joi.object({
  includeHeader: Joi.boolean().default(true),
  includeSign:   Joi.boolean().default(true),
  includeNotes:  Joi.boolean().default(false),
}).default()

const invoiceOptionsSchema = Joi.object({
  includeLogo: Joi.boolean().default(true),
  includeSig:  Joi.boolean().default(true),
  includeSJ:   Joi.boolean().default(false),
}).default()

const generateSJPdfSchema      = Joi.object({ options: sjOptionsSchema })
const generateInvoicePdfSchema = Joi.object({ options: invoiceOptionsSchema })

module.exports = {
  generateSJPdfSchema,
  generateInvoicePdfSchema,
  sjOptionsSchema,
  invoiceOptionsSchema,
}
