'use strict'

/**
 * Tambah kolom is_down_payment ke tabel payments.
 * Konvensi: 1 invoice → maksimal 1 payment dengan is_down_payment = true (DP).
 * Payment biasa (regular payment) tetap is_down_payment = false (default).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'is_down_payment', {
      type:         Sequelize.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'TRUE = uang muka (DP). Maksimal 1 DP per invoice.',
    })

    // Partial unique index — supaya hanya 1 row dgn is_down_payment=true per invoice.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX payments_one_dp_per_invoice_idx
      ON payments (invoice_id)
      WHERE is_down_payment = true;
    `)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS payments_one_dp_per_invoice_idx;'
    )
    await queryInterface.removeColumn('payments', 'is_down_payment')
  },
}
