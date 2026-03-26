'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_orders', {
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
      sj_number: {
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
      fleet_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'fleets', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      driver_id: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'drivers', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      driver_name_manual: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      sj_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      origin: {
        type:      Sequelize.STRING(200),
        allowNull: false,
      },
      destination: {
        type:      Sequelize.STRING(200),
        allowNull: false,
      },
      cargo_description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      operational_cost: {
        type:         Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      status: {
        type:         Sequelize.STRING(10),
        defaultValue: 'draft',
      },
      invoice_id: {
        type:      Sequelize.BIGINT,
        allowNull: true,
        comment:   'Nullable — SJ bisa ada tanpa invoice',
      },
      invoice_attachment_status: {
        type:         Sequelize.STRING(15),
        defaultValue: 'no_invoice',
      },
      delivered_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      pod_photo_path: {
        type:      Sequelize.STRING(255),
        allowNull: true,
      },
      void_reason: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      internal_notes: {
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
      updated_by: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    })

    await queryInterface.addIndex('delivery_orders', ['status'],                     { name: 'do_status_idx' })
    await queryInterface.addIndex('delivery_orders', ['invoice_attachment_status'],  { name: 'do_attachment_status_idx' })
    await queryInterface.addIndex('delivery_orders', ['project_id'],                 { name: 'do_project_id_idx' })
    await queryInterface.addIndex('delivery_orders', ['customer_id'],                { name: 'do_customer_id_idx' })
    await queryInterface.addIndex('delivery_orders', ['fleet_id'],                   { name: 'do_fleet_id_idx' })
    await queryInterface.addIndex('delivery_orders', ['sj_date'],                    { name: 'do_sj_date_idx' })
    await queryInterface.addIndex('delivery_orders', ['invoice_id'],                 { name: 'do_invoice_id_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_orders')
  },
}
