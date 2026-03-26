'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pdf_jobs', {
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
      job_type: {
        type:      Sequelize.STRING(20),
        allowNull: false,
      },
      record_id: {
        type:      Sequelize.BIGINT,
        allowNull: false,
      },
      status: {
        type:         Sequelize.STRING(15),
        defaultValue: 'pending',
      },
      file_path: {
        type:      Sequelize.STRING(255),
        allowNull: true,
      },
      error_message: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      requested_by: {
        type:       Sequelize.BIGINT,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      processed_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pdf_jobs')
  },
}
