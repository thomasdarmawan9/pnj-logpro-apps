'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('customers', {
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
        type:      Sequelize.STRING(150),
        allowNull: false,
      },
      pic_name: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      phone: {
        type:      Sequelize.STRING(20),
        allowNull: true,
      },
      email: {
        type:      Sequelize.STRING(150),
        allowNull: true,
      },
      address: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      npwp: {
        type:      Sequelize.STRING(30),
        allowNull: true,
      },
      is_pkp: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false,
        comment:      'PKP = auto-suggest PPN 1.1% di invoice',
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
    await queryInterface.dropTable('customers')
  },
}
