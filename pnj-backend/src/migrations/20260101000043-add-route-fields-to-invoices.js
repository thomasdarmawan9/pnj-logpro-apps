'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'origin', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Lokasi asal untuk invoice pengiriman tanpa/di luar SJ.',
    })
    await queryInterface.addColumn('invoices', 'destination', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Lokasi tujuan untuk invoice pengiriman tanpa/di luar SJ.',
    })
    await queryInterface.addColumn('invoices', 'cargo_description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Deskripsi muatan global invoice pengiriman.',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'cargo_description')
    await queryInterface.removeColumn('invoices', 'destination')
    await queryInterface.removeColumn('invoices', 'origin')
  },
}
