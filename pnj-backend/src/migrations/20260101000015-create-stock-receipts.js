'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_receipts', {
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
      receipt_number: {
        type:      Sequelize.STRING(50),
        allowNull: false,
        unique:    true,
      },
      receipt_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      supplier_name: {
        type:      Sequelize.STRING(150),
        allowNull: true,
      },
      document_number: {
        type:      Sequelize.STRING(100),
        allowNull: true,
        comment:   'Contoh: SPAL 141',
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_receipts')
  },
}
