'use strict'

const Joi = require('joi')

const sjOptionsSchema = Joi.object({
  includeHeader:   Joi.boolean().default(true),
  includeSign:     Joi.boolean().default(true),
  includeNotes:    Joi.boolean().default(false),
  includeLampiran: Joi.boolean().default(true),
  // Jumlah rangkap — tiap salinan di halaman terpisah (default 3)
  copies:          Joi.number().integer().min(1).max(10).default(3),
  // Tambahkan label "Lembar X/N" di sudut kanan bawah tiap salinan
  copyLabel:       Joi.boolean().default(false),
}).default()

const invoiceOptionsSchema = Joi.object({
  includeLogo: Joi.boolean().default(true),
  includeSig:  Joi.boolean().default(true),
  includeSJ:   Joi.boolean().default(false),
  // Jumlah rangkap — tiap salinan di halaman terpisah (default 3)
  copies:      Joi.number().integer().min(1).max(10).default(3),
  // Tambahkan label "Lembar X/N" di sudut kanan bawah tiap salinan
  copyLabel:   Joi.boolean().default(false),
}).default()

const generateSJPdfSchema      = Joi.object({ options: sjOptionsSchema })
const generateInvoicePdfSchema = Joi.object({ options: invoiceOptionsSchema })

module.exports = {
  generateSJPdfSchema,
  generateInvoicePdfSchema,
  sjOptionsSchema,
  invoiceOptionsSchema,
}
