'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fleet_rental_completions', {
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
      fleet_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'fleets', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      invoice_item_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'invoice_items', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      completed_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.fn('NOW'),
      },
      completed_by: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('fleet_rental_completions', ['fleet_id'], {
      name: 'fleet_rental_completions_fleet_id_idx',
    })
    await queryInterface.addIndex('fleet_rental_completions', ['invoice_item_id'], {
      name: 'fleet_rental_completions_invoice_item_id_idx',
    })
    await queryInterface.addIndex('fleet_rental_completions', ['fleet_id', 'invoice_item_id'], {
      name:   'fleet_rental_completions_fleet_item_unique_idx',
      unique: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fleet_rental_completions')
  },
}
