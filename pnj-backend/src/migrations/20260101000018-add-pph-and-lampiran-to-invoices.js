'use strict'

/**
 * Menambahkan field yang dipakai frontend tapi belum ada di tabel invoices:
 *   - pph_percent     : persentase PPh (Pajak Penghasilan), dikurangi dari total
 *   - pph_amount      : nilai PPh (subtotal × pph_percent / 100)
 *   - lampiran_paths  : array path lampiran tambahan (BA, kontrak, dll)
 *
 * Catatan:
 *   total_amount = subtotal + tax_amount - pph_amount
 *   Perhitungan wajib dilakukan server-side di InvoiceService (jangan percaya client).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'pph_percent', {
      type:         Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'Persentase PPh — dikurangi dari total invoice',
    })

    await queryInterface.addColumn('invoices', 'pph_amount', {
      type:         Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'subtotal × pph_percent / 100',
    })

    await queryInterface.addColumn('invoices', 'lampiran_paths', {
      type:      Sequelize.ARRAY(Sequelize.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran tambahan (BA, kontrak, dll) relatif terhadap UPLOAD_DIR',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'lampiran_paths')
    await queryInterface.removeColumn('invoices', 'pph_amount')
    await queryInterface.removeColumn('invoices', 'pph_percent')
  },
}
