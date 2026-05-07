'use strict'

const { SystemSetting } = require('../models')

const COMPANY_KEYS = [
  'company_name',
  'company_address',
  'company_phone',
  'company_email',
  'company_website',
  'company_bank_name',
  'company_bank_account',
  'company_bank_holder',
  'company_logo_path',
]

/**
 * Ambil setting perusahaan untuk render header/footer di PDF.
 * Return plain object: { name, address, phone, email, website, bank: {...}, logoPath }
 */
async function getCompanyInfo(t) {
  const rows = await SystemSetting.findAll({
    where:       { key: COMPANY_KEYS },
    transaction: t,
  })
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    name:    map.company_name        || '',
    address: map.company_address     || '',
    phone:   map.company_phone       || '',
    email:   map.company_email       || '',
    website: map.company_website     || '',
    bank: {
      name:    map.company_bank_name    || '',
      account: map.company_bank_account || '',
      holder:  map.company_bank_holder  || '',
    },
    logoPath: map.company_logo_path  || '',
  }
}

module.exports = { COMPANY_KEYS, getCompanyInfo }
