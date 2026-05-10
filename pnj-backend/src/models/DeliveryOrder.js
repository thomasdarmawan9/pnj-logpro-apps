'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const DeliveryOrder = sequelize.define('DeliveryOrder', {
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
    sj_number: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      unique:    true,
    },
    project_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    customer_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    fleet_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    driver_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    driver_name_manual: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    sj_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    origin: {
      type:      DataTypes.STRING(200),
      allowNull: false,
    },
    destination: {
      type:      DataTypes.STRING(200),
      allowNull: false,
    },
    cargo_description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    operational_cost: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    status: {
      type:         DataTypes.STRING(10),
      defaultValue: 'draft',
      validate:     { isIn: [['draft', 'assigned', 'delivered', 'void']] },
    },
    invoice_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
      comment:   'Nullable — SJ bisa ada tanpa invoice',
    },
    invoice_attachment_status: {
      type:         DataTypes.STRING(15),
      defaultValue: 'no_invoice',
      validate:     { isIn: [['no_invoice', 'attached']] },
    },
    delivered_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    pod_photo_path: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
    void_reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    lampiran_paths: {
      type:      DataTypes.ARRAY(DataTypes.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran tambahan SJ (BAP, tanda terima, dll)',
    },
    items: {
      type:      DataTypes.JSONB,
      allowNull: true,
      comment:   'Rincian item muatan SJ [{ id, description, qty, unit, notes }]',
    },
    internal_notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    updated_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'delivery_orders',
    paranoid:  true,
  })

  return DeliveryOrder
}
