'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'insurance_amount', {
      type:         Sequelize.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Nominal asuransi — ditambahkan setelah PPN/PPh, tidak masuk DPP',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'insurance_amount')
  },
}
