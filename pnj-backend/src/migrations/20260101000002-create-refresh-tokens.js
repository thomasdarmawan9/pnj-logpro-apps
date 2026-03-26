'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
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
      user_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      token_hash: {
        type:      Sequelize.STRING(255),
        allowNull: false,
        unique:    true,
        comment:   'SHA-256 hash dari refresh token',
      },
      expires_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
      is_revoked: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false,
      },
      ip_address: {
        type:      Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
    })

    await queryInterface.addIndex('refresh_tokens', ['user_id'],    { name: 'refresh_tokens_user_id_idx' })
    await queryInterface.addIndex('refresh_tokens', ['token_hash'], { unique: true, name: 'refresh_tokens_token_hash_unique' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens')
  },
}
