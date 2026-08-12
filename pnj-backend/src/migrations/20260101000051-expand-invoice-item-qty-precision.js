'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('invoice_items', 'qty', {
      type:         Sequelize.DECIMAL(12, 4),
      allowNull:    true,
      defaultValue: 1,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('invoice_items', 'qty', {
      type:         Sequelize.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: 1,
    })
  },
}
