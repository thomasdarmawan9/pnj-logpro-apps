'use strict'

/**
 * Menambahkan key-key numbering reset + project code sequence yang belum ada
 * pada seeder sistem (20260101000001-seed-system-settings).
 *
 * - sj_seq_reset            : 'yearly' (SJ reset tiap awal tahun)
 * - invoice_seq_reset       : 'never'  (invoice_number lanjut terus, tidak reset)
 * - stock_receipt_seq_reset : 'yearly'
 * - stock_disburse_seq_reset: 'yearly'
 * - project_code_seq_current: '0'      (counter untuk generateProjectCode)
 *
 * Memakai ignoreDuplicates=true agar aman dijalankan ulang meskipun
 * seeder system_settings sudah pernah diterapkan.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'system_settings',
      [
        { key: 'sj_seq_reset',             value: 'yearly' },
        { key: 'invoice_seq_reset',        value: 'never'  },
        { key: 'stock_receipt_seq_reset',  value: 'yearly' },
        { key: 'stock_disburse_seq_reset', value: 'yearly' },
        { key: 'project_code_seq_current', value: '0'      },
      ],
      { ignoreDuplicates: true }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'system_settings',
      {
        key: {
          [Sequelize.Op.in]: [
            'sj_seq_reset',
            'invoice_seq_reset',
            'stock_receipt_seq_reset',
            'stock_disburse_seq_reset',
            'project_code_seq_current',
          ],
        },
      },
      {}
    )
  },
}
