'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('fleets', [
      {
        plate_number: 'TBD',
        name:         'Belum Ditentukan',
        category:     'other',
        status:       'active',
        is_tbd:       true,
        created_at:   new Date(),
        updated_at:   new Date(),
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('fleets', { plate_number: 'TBD' }, {})
  },
}
