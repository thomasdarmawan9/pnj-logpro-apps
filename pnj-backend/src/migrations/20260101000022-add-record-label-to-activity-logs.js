'use strict'

/**
 * Menambahkan record_label ke activity_logs.
 *
 * Frontend AuditLog entity menampilkan kolom "Record" berupa label ringkas
 * (misalnya "SJ-2026-0089", "INV-1234", "PT. ATP BIO") agar user tidak
 * perlu membuka detail baris hanya untuk mengetahui dokumen apa yang
 * dimodifikasi.
 *
 * Dipopulasikan oleh activityLog.middleware saat mutasi sukses:
 *   - untuk SJ      : sj_number
 *   - untuk Invoice : invoice_number
 *   - untuk Master  : entity.name / plate_number
 *   - untuk Stock   : receipt_number / disbursement_number
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activity_logs', 'record_label', {
      type:      Sequelize.STRING(200),
      allowNull: true,
      comment:   'Label ringkas record yang dimodifikasi (sj_number / invoice_number / name / dll)',
    })

    await queryInterface.addIndex('activity_logs', ['module', 'action'], {
      name: 'activity_logs_module_action_idx',
    })
    await queryInterface.addIndex('activity_logs', ['record_uuid'], {
      name: 'activity_logs_record_uuid_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('activity_logs', 'activity_logs_record_uuid_idx')
    await queryInterface.removeIndex('activity_logs', 'activity_logs_module_action_idx')
    await queryInterface.removeColumn('activity_logs', 'record_label')
  },
}
