'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
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
        onDelete:   'RESTRICT',
      },
      payment_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      amount: {
        type:      Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      method: {
        type:      Sequelize.STRING(10),
        allowNull: false,
      },
      proof_path: {
        type:      Sequelize.STRING(255),
        allowNull: true,
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
    })

    await queryInterface.addIndex('payments', ['invoice_id'], { name: 'payments_invoice_id_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments')
  },
}
