'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'idempotency_key', {
      type:      Sequelize.UUID,
      allowNull: true,
      comment:   'Kunci unik dari client untuk mencegah invoice ganda saat request create diulang.',
    })

    await queryInterface.addColumn('invoices', 'idempotency_payload_hash', {
      type:      Sequelize.STRING(64),
      allowNull: true,
      comment:   'SHA-256 payload create untuk mendeteksi pemakaian ulang key dengan data berbeda.',
    })

    await queryInterface.addIndex('invoices', ['idempotency_key'], {
      name:   'invoices_idempotency_key_unique',
      unique: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('invoices', 'invoices_idempotency_key_unique')
    await queryInterface.removeColumn('invoices', 'idempotency_payload_hash')
    await queryInterface.removeColumn('invoices', 'idempotency_key')
  },
}
