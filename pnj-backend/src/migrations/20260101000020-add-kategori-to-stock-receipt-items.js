'use strict'

/**
 * Menambahkan kategori_name ke stock_receipt_items.
 *
 * Frontend CreateStockReceiptItemDto dan laporan rekap stok menampilkan
 * kolom "kategori" per baris penerimaan — agar bisa memisahkan kategori
 * barang di waktu penerimaan tanpa harus mengubah master StockItem.
 *
 * Kolom ini nullable karena tidak semua transaksi membutuhkannya.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_receipt_items', 'kategori_name', {
      type:      Sequelize.STRING(50),
      allowNull: true,
      comment:   'Kategori per baris (mis. "Batu Mangan", "Batu Chrome"). Opsional.',
    })

    await queryInterface.addIndex('stock_receipt_items', ['kategori_name'], {
      name: 'sri_kategori_name_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('stock_receipt_items', 'sri_kategori_name_idx')
    await queryInterface.removeColumn('stock_receipt_items', 'kategori_name')
  },
}
