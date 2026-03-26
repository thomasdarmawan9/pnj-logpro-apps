'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoice_items', {
      id: {
        type:          Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey:    true,
      },
      uuid: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull:    false,
        unique:       true,
      },
      invoice_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'invoices', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      fleet_id: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'fleets', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      fleet_label: {
        type:      Sequelize.STRING(150),
        allowNull: false,
        comment:   'Label kendaraan di invoice — bisa diedit manual',
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      period_start: {
        type:      Sequelize.DATEONLY,
        allowNull: true,
      },
      period_end: {
        type:      Sequelize.DATEONLY,
        allowNull: true,
      },
      qty: {
        type:         Sequelize.DECIMAL(10, 2),
        defaultValue: 1,
      },
      unit: {
        type:         Sequelize.STRING(20),
        defaultValue: 'Unit',
      },
      unit_price: {
        type:      Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      subtotal: {
        type:      Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment:   'qty × unit_price',
      },
      sort_order: {
        type:         Sequelize.SMALLINT,
        defaultValue: 0,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('invoice_items', ['invoice_id'], { name: 'invoice_items_invoice_id_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoice_items')
  },
}
