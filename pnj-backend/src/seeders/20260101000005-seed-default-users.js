'use strict'

const bcrypt = require('bcryptjs')

/**
 * Seed dua akun default untuk role admin_ops dan admin_finance.
 * Password awal di-hardcode untuk bootstrap — wajib diubah setelah login pertama.
 *
 *  - ops@pnj.co.id      / PNJ@ops2026     → role admin_ops
 *  - finance@pnj.co.id  / PNJ@finance2026 → role admin_finance
 *
 * Super admin sudah di-seed oleh 20260101000002-seed-super-admin.js.
 */
module.exports = {
  async up(queryInterface) {
    const [opsHash, financeHash] = await Promise.all([
      bcrypt.hash('PNJ@ops2026', 12),
      bcrypt.hash('PNJ@finance2026', 12),
    ])

    const now = new Date()

    await queryInterface.bulkInsert(
      'users',
      [
        {
          name:          'Admin Operasional',
          email:         'ops@pnj.co.id',
          password:      opsHash,
          role:          'admin_ops',
          is_active:     true,
          login_attempt: 0,
          created_at:    now,
          updated_at:    now,
        },
        {
          name:          'Admin Finance',
          email:         'finance@pnj.co.id',
          password:      financeHash,
          role:          'admin_finance',
          is_active:     true,
          login_attempt: 0,
          created_at:    now,
          updated_at:    now,
        },
      ],
      { ignoreDuplicates: true }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'users',
      {
        email: {
          [Sequelize.Op.in]: ['ops@pnj.co.id', 'finance@pnj.co.id'],
        },
      },
      {}
    )
  },
}
