'use strict'

/**
 * Menambahkan lampiran_paths ke delivery_orders.
 *
 * Frontend SuratJalan entity sudah menggunakan field ini untuk menyimpan
 * beberapa file pendukung (selain pod_photo_path), misalnya scan tanda
 * terima, BAP, atau dokumen lain.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('delivery_orders', 'lampiran_paths', {
      type:      Sequelize.ARRAY(Sequelize.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran tambahan SJ (BAP, tanda terima, dll) relatif terhadap UPLOAD_DIR',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('delivery_orders', 'lampiran_paths')
  },
}
