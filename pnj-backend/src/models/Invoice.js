'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
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
    invoice_number: {
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
    invoice_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    due_date: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    subtotal_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    tax_percent: {
      type:         DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    tax_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    pph_percent: {
      type:         DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'Persentase PPh — dikurangi dari total invoice',
    },
    pph_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull:    false,
      comment:      'subtotal × pph_percent / 100',
    },
    total_amount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment:   'Netto = subtotal + tax_amount - pph_amount',
    },
    paid_amount: {
      type:         DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    status: {
      type:         DataTypes.STRING(15),
      defaultValue: 'draft',
      validate:     { isIn: [['draft', 'sent', 'outstanding', 'paid', 'void']] },
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    sent_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    void_reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    lampiran_paths: {
      type:      DataTypes.ARRAY(DataTypes.STRING(255)),
      allowNull: true,
      comment:   'Path lampiran tambahan relatif terhadap UPLOAD_DIR',
    },
    payment_method: {
      type:         DataTypes.STRING(20),
      defaultValue: 'transfer',
      allowNull:    false,
    },
    bank_account_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
    created_by: {
      type:      DataTypes.BIGINT,
      allowNull: true,
    },
  }, {
    tableName: 'invoices',
    paranoid:  true,
  })

  return Invoice
}
