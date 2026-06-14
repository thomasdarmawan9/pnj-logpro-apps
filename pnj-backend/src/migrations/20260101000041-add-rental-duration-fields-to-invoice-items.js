'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoice_items', 'rental_duration_years', {
      type:         Sequelize.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Durasi pemakaian penyewaan dalam tahun.',
    })
    await queryInterface.addColumn('invoice_items', 'rental_duration_months', {
      type:         Sequelize.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Durasi pemakaian penyewaan dalam bulan.',
    })
    await queryInterface.addColumn('invoice_items', 'rental_duration_days', {
      type:         Sequelize.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Durasi pemakaian penyewaan dalam hari.',
    })
    await queryInterface.addColumn('invoice_items', 'rental_duration_hours', {
      type:         Sequelize.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Durasi pemakaian penyewaan dalam jam.',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoice_items', 'rental_duration_hours')
    await queryInterface.removeColumn('invoice_items', 'rental_duration_days')
    await queryInterface.removeColumn('invoice_items', 'rental_duration_months')
    await queryInterface.removeColumn('invoice_items', 'rental_duration_years')
  },
}
