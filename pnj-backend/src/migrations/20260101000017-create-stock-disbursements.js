'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_disbursements', {
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
      disbursement_number: {
        type:      Sequelize.STRING(50),
        allowNull: false,
        unique:    true,
      },
      disbursement_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      stock_item_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'stock_items', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      qty: {
        type:      Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      delivery_order_id: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'delivery_orders', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
        comment:    'FK ke SJ — opsional',
      },
      sj_number_manual: {
        type:      Sequelize.STRING(50),
        allowNull: true,
      },
      invoice_number_manual: {
        type:      Sequelize.STRING(50),
        allowNull: true,
      },
      driver_name: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      vehicle_plate: {
        type:      Sequelize.STRING(20),
        allowNull: true,
      },
      destination: {
        type:      Sequelize.STRING(200),
        allowNull: true,
      },
      customer_id: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'customers', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      notes: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    })

    await queryInterface.addIndex('stock_disbursements', ['stock_item_id'],      { name: 'sd_stock_item_id_idx' })
    await queryInterface.addIndex('stock_disbursements', ['disbursement_date'],  { name: 'sd_disbursement_date_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_disbursements')
  },
}
