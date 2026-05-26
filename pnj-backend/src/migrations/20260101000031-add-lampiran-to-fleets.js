'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('fleets', 'lampiran_paths', {
      type:      Sequelize.ARRAY(Sequelize.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran foto armada relatif terhadap UPLOAD_DIR',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('fleets', 'lampiran_paths')
  },
}
