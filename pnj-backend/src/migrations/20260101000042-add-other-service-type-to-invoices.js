'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'custom_service_name', {
      type:      Sequelize.STRING(100),
      allowNull: true,
      comment:   'Nama jasa manual untuk service_type=other.',
    })

    await queryInterface.removeConstraint('invoices', 'invoices_service_type_check')
    await queryInterface.addConstraint('invoices', {
      fields: ['service_type'],
      type:   'check',
      name:   'invoices_service_type_check',
      where:  {
        service_type: ['delivery', 'rental', 'other'],
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('invoices', 'invoices_service_type_check')
    await queryInterface.addConstraint('invoices', {
      fields: ['service_type'],
      type:   'check',
      name:   'invoices_service_type_check',
      where:  {
        service_type: ['delivery', 'rental'],
      },
    })
    await queryInterface.removeColumn('invoices', 'custom_service_name')
  },
}
