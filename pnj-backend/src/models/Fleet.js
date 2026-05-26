'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Fleet = sequelize.define('Fleet', {
    id: {
      type:          DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey:    true,
    },
    uuid: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
      unique:       true,
    },
    plate_number: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      unique:    true,
    },
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    category: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      validate:  { isIn: [['truck', 'trailer', 'family_car', 'heavy_equipment', 'other']] },
    },
    brand: {
      type:      DataTypes.STRING(50),
      allowNull: true,
    },
    year: {
      type:      DataTypes.SMALLINT,
      allowNull: true,
    },
    capacity_ton: {
      type:      DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    status: {
      type:         DataTypes.STRING(10),
      defaultValue: 'active',
      validate:     { isIn: [['active', 'inactive', 'repair', 'sold']] },
    },
    is_tbd: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
      comment:      'TBD Fleet tidak bisa diedit/dihapus',
    },
    photo_path: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
    lampiran_paths: {
      type:      DataTypes.ARRAY(DataTypes.STRING(255)),
      allowNull: true,
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'fleets',
    paranoid:  true,
  })

  return Fleet
}
