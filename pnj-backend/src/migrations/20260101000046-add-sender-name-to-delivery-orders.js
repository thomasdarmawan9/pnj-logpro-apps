'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('delivery_orders', 'sender_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      after: 'internal_notes',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('delivery_orders', 'sender_name')
  },
}
