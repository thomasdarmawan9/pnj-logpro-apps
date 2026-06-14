'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'manual_sj_numbers', {
      type:      Sequelize.TEXT,
      allowNull: true,
      comment:   'Nomor SJ manual untuk invoice pengiriman jika tidak dikaitkan ke SJ database.',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'manual_sj_numbers')
  },
}
