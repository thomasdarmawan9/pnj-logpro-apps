'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_accounts', {
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
      bank_name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      account_number: {
        type:      Sequelize.STRING(50),
        allowNull: false,
      },
      account_holder: {
        type:      Sequelize.STRING(150),
        allowNull: false,
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull:    false,
      },
      sort_order: {
        type:         Sequelize.INTEGER,
        defaultValue: 0,
        allowNull:    false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_accounts')
  },
}
