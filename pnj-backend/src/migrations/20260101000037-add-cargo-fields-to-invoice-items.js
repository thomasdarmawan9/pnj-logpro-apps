'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoice_items', 'cargo_qty', {
      type:         Sequelize.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: null,
      comment:      'Jumlah muatan/barang. Terpisah dari qty tagihan invoice.',
    })
    await queryInterface.addColumn('invoice_items', 'cargo_unit', {
      type:         Sequelize.STRING(30),
      allowNull:    true,
      defaultValue: null,
      comment:      'Satuan muatan/barang. Terpisah dari unit tagihan invoice.',
    })
    await queryInterface.addColumn('invoice_items', 'cargo_notes', {
      type:      Sequelize.TEXT,
      allowNull: true,
      comment:   'Catatan muatan/barang dari SJ atau input manual invoice.',
    })
    await queryInterface.sequelize.query(`
      UPDATE invoice_items
      SET cargo_qty = qty,
          cargo_unit = unit
      WHERE cargo_qty IS NULL
        AND cargo_unit IS NULL
    `)
    await queryInterface.sequelize.query(`
      UPDATE delivery_orders
      SET items = stripped.items
      FROM (
        SELECT id, jsonb_agg(elem - 'unit_price' ORDER BY ord) AS items
        FROM delivery_orders,
             jsonb_array_elements(items) WITH ORDINALITY AS arr(elem, ord)
        WHERE jsonb_typeof(items) = 'array'
        GROUP BY id
      ) AS stripped
      WHERE delivery_orders.id = stripped.id
    `)
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoice_items', 'cargo_notes')
    await queryInterface.removeColumn('invoice_items', 'cargo_unit')
    await queryInterface.removeColumn('invoice_items', 'cargo_qty')
  },
}
