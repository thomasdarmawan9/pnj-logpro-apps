'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'payment_method', {
      type:         Sequelize.STRING(20),
      defaultValue: 'transfer',
      allowNull:    false,
      comment:      'transfer | cash | check',
    })

    await queryInterface.addColumn('invoices', 'bank_account_id', {
      type:       Sequelize.BIGINT,
      allowNull:  true,
      references: { model: 'bank_accounts', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'SET NULL',
      comment:    'Rekening tujuan (hanya relevan jika payment_method = transfer)',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'bank_account_id')
    await queryInterface.removeColumn('invoices', 'payment_method')
  },
}
