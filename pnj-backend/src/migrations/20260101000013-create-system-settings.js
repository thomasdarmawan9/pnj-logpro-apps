'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_settings', {
      key: {
        type:       Sequelize.STRING(50),
        primaryKey: true,
      },
      value: {
        type:      Sequelize.TEXT,
        allowNull: false,
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_settings')
  },
}
