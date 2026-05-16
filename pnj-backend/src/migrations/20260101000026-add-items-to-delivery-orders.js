'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('delivery_orders', 'items', {
      type:      Sequelize.JSONB,
      allowNull: true,
      comment:   'Rincian item muatan SJ [{ id, description, qty, unit, notes }]',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('delivery_orders', 'items')
  },
}
