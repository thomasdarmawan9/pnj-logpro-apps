'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;')

    await queryInterface.createTable('users', {
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
      name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type:      Sequelize.STRING(150),
        allowNull: false,
        unique:    true,
      },
      password: {
        type:      Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type:      Sequelize.STRING(20),
        allowNull: false,
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        defaultValue: true,
      },
      login_attempt: {
        type:         Sequelize.SMALLINT,
        defaultValue: 0,
      },
      locked_until: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      last_login_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
    })

    await queryInterface.addIndex('users', ['email'],  { unique: true, name: 'users_email_unique' })
    await queryInterface.addIndex('users', ['uuid'],   { unique: true, name: 'users_uuid_unique' })
    await queryInterface.addIndex('users', ['role'],   { name: 'users_role_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users')
  },
}
