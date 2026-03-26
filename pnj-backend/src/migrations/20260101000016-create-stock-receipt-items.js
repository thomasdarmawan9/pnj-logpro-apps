'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_receipt_items', {
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
      receipt_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'stock_receipts', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
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
      notes: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('stock_receipt_items', ['receipt_id'],    { name: 'sri_receipt_id_idx' })
    await queryInterface.addIndex('stock_receipt_items', ['stock_item_id'], { name: 'sri_stock_item_id_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_receipt_items')
  },
}
