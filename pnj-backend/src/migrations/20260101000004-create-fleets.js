'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fleets', {
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
      plate_number: {
        type:      Sequelize.STRING(20),
        allowNull: false,
        unique:    true,
      },
      name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      category: {
        type:      Sequelize.STRING(20),
        allowNull: false,
      },
      brand: {
        type:      Sequelize.STRING(50),
        allowNull: true,
      },
      year: {
        type:      Sequelize.SMALLINT,
        allowNull: true,
      },
      capacity_ton: {
        type:      Sequelize.DECIMAL(8, 2),
        allowNull: true,
      },
      status: {
        type:         Sequelize.STRING(10),
        defaultValue: 'active',
      },
      is_tbd: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false,
        comment:      'TBD Fleet tidak bisa diedit/dihapus',
      },
      photo_path: {
        type:      Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fleets')
  },
}
