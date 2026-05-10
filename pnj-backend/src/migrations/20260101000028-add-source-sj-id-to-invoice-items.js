'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoice_items', 'source_sj_id', {
      type:         Sequelize.BIGINT,
      allowNull:    true,
      defaultValue: null,
      comment:      'Null = item manual. Non-null = item disalin dari SJ saat attach.',
      references:   { model: 'delivery_orders', key: 'id' },
      onDelete:     'SET NULL',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoice_items', 'source_sj_id')
  },
}
