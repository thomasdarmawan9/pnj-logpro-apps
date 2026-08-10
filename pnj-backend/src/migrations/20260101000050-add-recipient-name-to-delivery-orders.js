'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('delivery_orders', 'recipient_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      after: 'sender_name',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('delivery_orders', 'recipient_name')
  },
}
