'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoice_items', 'driver_id', {
      type:       Sequelize.BIGINT,
      allowNull:  true,
      references: { model: 'drivers', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'SET NULL',
      comment:    'Supir master untuk item invoice pengiriman manual.',
    })
    await queryInterface.addColumn('invoice_items', 'driver_name_manual', {
      type:      Sequelize.STRING(100),
      allowNull: true,
      comment:   'Nama supir manual jika tidak memakai master supir.',
    })
    await queryInterface.addIndex('invoice_items', ['driver_id'], {
      name: 'invoice_items_driver_id_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('invoice_items', 'invoice_items_driver_id_idx')
    await queryInterface.removeColumn('invoice_items', 'driver_name_manual')
    await queryInterface.removeColumn('invoice_items', 'driver_id')
  },
}
