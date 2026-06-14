'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoice_items', 'cargo_weight', {
      type:         Sequelize.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: null,
      comment:      'Berat muatan/barang untuk invoice pengiriman.',
    })
    await queryInterface.addColumn('invoice_items', 'cargo_volume', {
      type:         Sequelize.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: null,
      comment:      'Volume muatan/barang untuk invoice pengiriman.',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoice_items', 'cargo_volume')
    await queryInterface.removeColumn('invoice_items', 'cargo_weight')
  },
}
