'use strict'

const bcrypt = require('bcryptjs')

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('PNJ@admin2026', 12)

    await queryInterface.bulkInsert('users', [
      {
        name:          'Admin PNJ',
        email:         'admin@pnj.co.id',
        password:      passwordHash,
        role:          'super_admin',
        is_active:     true,
        login_attempt: 0,
        created_at:    new Date(),
        updated_at:    new Date(),
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@pnj.co.id' }, {})
  },
}
