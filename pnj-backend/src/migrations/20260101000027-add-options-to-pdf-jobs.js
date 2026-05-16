'use strict'

/**
 * Tambah kolom `options` (JSONB) ke tabel pdf_jobs.
 *
 * Tujuan: menyimpan opsi render (copies, copyLabel, includeHeader, dst.) di DB
 * sehingga options tidak hilang jika BullMQ / Redis restart sebelum job
 * diproses. Worker membaca options dari payload BullMQ (tetap ada), tapi
 * service.enqueue juga menyimpan salinannya ke DB untuk keperluan audit /
 * re-generate di masa depan.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pdf_jobs', 'options', {
      type:      Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Opsi render PDF (copies, copyLabel, includeHeader, dst.)',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pdf_jobs', 'options')
  },
}
