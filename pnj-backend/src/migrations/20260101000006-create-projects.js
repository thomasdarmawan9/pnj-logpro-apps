'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
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
      customer_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'customers', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      code: {
        type:      Sequelize.STRING(30),
        allowNull: false,
        unique:    true,
        comment:   'Auto-generate: PRJ-YYYY-NNN',
      },
      name: {
        type:      Sequelize.STRING(150),
        allowNull: false,
      },
      contract_number: {
        type:      Sequelize.STRING(50),
        allowNull: false,
        comment:   'Nomor kontrak resmi — wajib, tampil di header invoice',
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      start_date: {
        type:      Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type:      Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type:         Sequelize.STRING(15),
        defaultValue: 'active',
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
    await queryInterface.dropTable('projects')
  },
}
