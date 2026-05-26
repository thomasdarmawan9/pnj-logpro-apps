'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('drivers', 'lampiran_paths', {
      type:      Sequelize.ARRAY(Sequelize.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran foto supir relatif terhadap UPLOAD_DIR',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('drivers', 'lampiran_paths')
  },
}
