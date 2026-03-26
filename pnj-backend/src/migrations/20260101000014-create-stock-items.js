'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_items', {
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
      code: {
        type:      Sequelize.STRING(30),
        allowNull: false,
        unique:    true,
      },
      name: {
        type:      Sequelize.STRING(150),
        allowNull: false,
      },
      category: {
        type:      Sequelize.STRING(50),
        allowNull: true,
      },
      unit: {
        type:      Sequelize.STRING(20),
        allowNull: false,
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        defaultValue: true,
      },
      current_stock: {
        type:         Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
        comment:      'Running balance — diupdate setiap transaksi',
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

    await queryInterface.addIndex('stock_items', ['code'], { unique: true, name: 'stock_items_code_unique' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_items')
  },
}
