'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
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
      invoice_number: {
        type:      Sequelize.STRING(50),
        allowNull: false,
        unique:    true,
      },
      project_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'projects', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      customer_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'customers', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      invoice_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      due_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      subtotal_amount: {
        type:         Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      tax_percent: {
        type:         Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      tax_amount: {
        type:         Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_amount: {
        type:      Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment:   'Netto = subtotal + tax_amount',
      },
      paid_amount: {
        type:         Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      status: {
        type:         Sequelize.STRING(15),
        defaultValue: 'draft',
      },
      notes: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      sent_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      void_reason: {
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

    // Add FK for delivery_orders.invoice_id after invoices table exists
    await queryInterface.addConstraint('delivery_orders', {
      fields:     ['invoice_id'],
      type:       'foreign key',
      name:       'fk_delivery_orders_invoice_id',
      references: { table: 'invoices', field: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'SET NULL',
    })

    await queryInterface.addIndex('invoices', ['status'],      { name: 'invoices_status_idx' })
    await queryInterface.addIndex('invoices', ['project_id'],  { name: 'invoices_project_id_idx' })
    await queryInterface.addIndex('invoices', ['customer_id'], { name: 'invoices_customer_id_idx' })
    await queryInterface.addIndex('invoices', ['due_date'],    { name: 'invoices_due_date_idx' })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('delivery_orders', 'fk_delivery_orders_invoice_id')
    await queryInterface.dropTable('invoices')
  },
}
