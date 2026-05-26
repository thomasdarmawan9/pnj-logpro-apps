'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const FleetRentalCompletion = sequelize.define('FleetRentalCompletion', {
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
    fleet_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    invoice_item_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    completed_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
    completed_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'fleet_rental_completions',
    paranoid:  false,
    updatedAt: false,
  })

  return FleetRentalCompletion
}
