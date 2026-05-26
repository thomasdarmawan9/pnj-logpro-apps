'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('delivery_orders', 'project_id', {
      type:       Sequelize.BIGINT,
      allowNull:  true,
      references: { model: 'projects', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'RESTRICT',
    })

    await queryInterface.changeColumn('invoices', 'project_id', {
      type:       Sequelize.BIGINT,
      allowNull:  true,
      references: { model: 'projects', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'RESTRICT',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('delivery_orders', 'project_id', {
      type:       Sequelize.BIGINT,
      allowNull:  false,
      references: { model: 'projects', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'RESTRICT',
    })

    await queryInterface.changeColumn('invoices', 'project_id', {
      type:       Sequelize.BIGINT,
      allowNull:  false,
      references: { model: 'projects', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'RESTRICT',
    })
  },
}
