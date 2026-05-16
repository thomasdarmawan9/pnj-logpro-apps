'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'service_type', {
      type:         Sequelize.STRING(20),
      allowNull:    false,
      defaultValue: 'delivery',
      comment:      'delivery = jasa pengiriman, rental = jasa penyewaan',
    })
    await queryInterface.addIndex('invoices', ['service_type'], {
      name: 'invoices_service_type_idx',
    })
    await queryInterface.addConstraint('invoices', {
      fields: ['service_type'],
      type:   'check',
      name:   'invoices_service_type_check',
      where:  {
        service_type: ['delivery', 'rental'],
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('invoices', 'invoices_service_type_check')
    await queryInterface.removeIndex('invoices', 'invoices_service_type_idx')
    await queryInterface.removeColumn('invoices', 'service_type')
  },
}
