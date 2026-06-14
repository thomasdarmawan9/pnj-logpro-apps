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
    await queryInterface.sequelize.query(
      'ALTER TABLE delivery_orders ALTER COLUMN project_id DROP NOT NULL;'
    )

    await queryInterface.changeColumn('invoices', 'project_id', {
      type:       Sequelize.BIGINT,
      allowNull:  true,
      references: { model: 'projects', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'RESTRICT',
    })
    await queryInterface.sequelize.query(
      'ALTER TABLE invoices ALTER COLUMN project_id DROP NOT NULL;'
    )
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
