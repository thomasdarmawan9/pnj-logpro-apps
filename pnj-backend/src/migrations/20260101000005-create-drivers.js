'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('drivers', {
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
      phone: {
        type:      Sequelize.STRING(20),
        allowNull: true,
      },
      sim_number: {
        type:      Sequelize.STRING(30),
        allowNull: true,
      },
      sim_expired_at: {
        type:      Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type:         Sequelize.STRING(10),
        defaultValue: 'active',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('drivers')
  },
}
