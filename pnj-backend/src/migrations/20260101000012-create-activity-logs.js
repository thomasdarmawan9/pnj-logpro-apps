'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: {
        type:          Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey:    true,
      },
      user_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      action: {
        type:      Sequelize.STRING(50),
        allowNull: false,
      },
      module: {
        type:      Sequelize.STRING(30),
        allowNull: false,
      },
      record_uuid: {
        type:      Sequelize.UUID,
        allowNull: true,
      },
      old_data: {
        type:      Sequelize.JSONB,
        allowNull: true,
      },
      new_data: {
        type:      Sequelize.JSONB,
        allowNull: true,
      },
      ip_address: {
        type:      Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type:      Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('activity_logs', ['user_id'],    { name: 'activity_logs_user_id_idx' })
    await queryInterface.addIndex('activity_logs', ['module'],     { name: 'activity_logs_module_idx' })
    await queryInterface.addIndex('activity_logs', ['created_at'], { name: 'activity_logs_created_at_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs')
  },
}
