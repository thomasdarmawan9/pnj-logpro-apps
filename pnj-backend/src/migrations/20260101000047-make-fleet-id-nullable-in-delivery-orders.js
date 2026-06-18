'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('delivery_orders', 'fleet_id', {
      type:      Sequelize.BIGINT,
      allowNull: true,
    })
  },

  async down(queryInterface, Sequelize) {
    // Set any null fleet_id to 0 before restoring NOT NULL constraint
    await queryInterface.sequelize.query(
      `UPDATE delivery_orders SET fleet_id = 0 WHERE fleet_id IS NULL`
    )
    await queryInterface.changeColumn('delivery_orders', 'fleet_id', {
      type:      Sequelize.BIGINT,
      allowNull: false,
    })
  },
}
