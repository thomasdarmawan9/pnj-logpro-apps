'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'settlement_date', {
      type:      Sequelize.DATEONLY,
      allowNull: true,
      comment:   'Tanggal pembayaran yang membuat invoice berstatus lunas.',
    })

    await queryInterface.sequelize.query(`
      UPDATE invoices AS i
      SET settlement_date = (
        SELECT MAX(p.payment_date)
        FROM payments AS p
        WHERE p.invoice_id = i.id
      )
      WHERE i.status = 'paid'
    `)

    await queryInterface.addIndex('invoices', ['settlement_date'], {
      name: 'invoices_settlement_date_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('invoices', 'invoices_settlement_date_idx')
    await queryInterface.removeColumn('invoices', 'settlement_date')
  },
}
