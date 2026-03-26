'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('system_settings', [
      { key: 'sj_number_format',            value: 'SJ-{YYYY}-{SEQ4}' },
      { key: 'sj_seq_current',              value: '0' },
      { key: 'invoice_number_format',       value: '{SEQ}' },
      { key: 'invoice_seq_current',         value: '2829' },
      { key: 'stock_receipt_format',        value: 'STK-MSK-{YYYY}-{SEQ3}' },
      { key: 'stock_receipt_seq_current',   value: '0' },
      { key: 'stock_disburse_format',       value: 'STK-KLR-{YYYY}-{SEQ3}' },
      { key: 'stock_disburse_seq_current',  value: '0' },
      { key: 'company_name',                value: 'PT. Pelangi Nuansa Jaya' },
      { key: 'company_address',             value: 'Jl. Arteri Supadio, Komplek Adijaya town house, block c no 1 dan 2, Kubu Raya, Kalimantan Barat' },
      { key: 'company_phone',               value: '0858-4901-6746 / 0822-5412-1996' },
      { key: 'company_email',               value: 'pelanginuansagroup@gmail.com' },
      { key: 'company_website',             value: 'www.ekspedisipontianakkalbar.com' },
      { key: 'company_bank_name',           value: 'BCA' },
      { key: 'company_bank_account',        value: '7345265678' },
      { key: 'company_bank_holder',         value: 'PT. Pelangi Nuansa Jaya' },
      { key: 'company_logo_path',           value: '' },
      { key: 'default_tax_percent',         value: '1.10' },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('system_settings', null, {})
  },
}
