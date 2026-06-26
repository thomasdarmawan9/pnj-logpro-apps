'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'delivery_date', {
      type:      Sequelize.DATEONLY,
      allowNull: true,
      comment:   'Tanggal pengiriman manual untuk invoice jasa pengiriman; tampil di PDF.',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'delivery_date')
  },
}
