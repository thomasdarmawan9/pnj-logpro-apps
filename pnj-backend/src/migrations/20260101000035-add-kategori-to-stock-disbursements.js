'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_disbursements', 'kategori_name', {
      type:      Sequelize.STRING(50),
      allowNull: true,
      comment:   'Kategori stok keluar, dipakai untuk mencocokkan kategori penerimaan stok.',
    })

    await queryInterface.addIndex('stock_disbursements', ['kategori_name'], {
      name: 'sd_kategori_name_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('stock_disbursements', 'sd_kategori_name_idx')
    await queryInterface.removeColumn('stock_disbursements', 'kategori_name')
  },
}
