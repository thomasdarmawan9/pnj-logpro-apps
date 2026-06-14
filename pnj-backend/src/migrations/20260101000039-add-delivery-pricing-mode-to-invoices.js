'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'delivery_pricing_mode', {
      type:         Sequelize.STRING(20),
      allowNull:    false,
      defaultValue: 'shipment',
      comment:      'shipment = satu harga per pengiriman, item = harga per barang/muatan',
    })
    await queryInterface.addIndex('invoices', ['delivery_pricing_mode'], {
      name: 'invoices_delivery_pricing_mode_idx',
    })
    await queryInterface.addConstraint('invoices', {
      fields: ['delivery_pricing_mode'],
      type:   'check',
      name:   'invoices_delivery_pricing_mode_check',
      where:  {
        delivery_pricing_mode: ['shipment', 'item'],
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('invoices', 'invoices_delivery_pricing_mode_check')
    await queryInterface.removeIndex('invoices', 'invoices_delivery_pricing_mode_idx')
    await queryInterface.removeColumn('invoices', 'delivery_pricing_mode')
  },
}
