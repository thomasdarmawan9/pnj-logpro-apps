'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_disbursements', 'source_type', {
      type:         Sequelize.STRING(30),
      allowNull:    false,
      defaultValue: 'manual',
      comment:      'manual = stok keluar dibuat user. sj_auto = otomatis dari item stok di SJ.',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_disbursements', 'source_type')
  },
}
