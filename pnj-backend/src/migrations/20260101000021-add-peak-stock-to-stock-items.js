'use strict'

/**
 * Menambahkan peak_stock ke stock_items.
 *
 * Frontend StockItem entity menggunakan peak_stock untuk menentukan
 * threshold indikator level saldo (hijau/amber/merah) di dashboard stok.
 * Kolom ini menyimpan nilai current_stock tertinggi yang pernah tercapai.
 *
 * Update logic (harus di StockService.stockIn):
 *   after receipt: peak_stock = GREATEST(peak_stock, current_stock)
 *
 * Data yang sudah ada (current_stock eksisting) dipakai sebagai nilai awal
 * peak_stock agar indikator langsung akurat setelah migrasi.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_items', 'peak_stock', {
      type:         Sequelize.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'Saldo tertinggi yang pernah dicapai — dipakai untuk indikator level stok',
    })

    // Backfill peak_stock dari current_stock baris yang sudah ada.
    await queryInterface.sequelize.query(
      'UPDATE stock_items SET peak_stock = current_stock WHERE peak_stock < current_stock'
    )
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_items', 'peak_stock')
  },
}
