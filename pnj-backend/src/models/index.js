'use strict'

const { sequelize } = require('../config/database')

const User               = require('./User')(sequelize)
const RefreshToken       = require('./RefreshToken')(sequelize)
const Customer           = require('./Customer')(sequelize)
const Fleet              = require('./Fleet')(sequelize)
const Driver             = require('./Driver')(sequelize)
const Project            = require('./Project')(sequelize)
const DeliveryOrder      = require('./DeliveryOrder')(sequelize)
const Invoice            = require('./Invoice')(sequelize)
const InvoiceItem        = require('./InvoiceItem')(sequelize)
const Payment            = require('./Payment')(sequelize)
const PdfJob             = require('./PdfJob')(sequelize)
const ActivityLog        = require('./ActivityLog')(sequelize)
const SystemSetting      = require('./SystemSetting')(sequelize)
const StockItem          = require('./StockItem')(sequelize)
const StockReceipt       = require('./StockReceipt')(sequelize)
const StockReceiptItem   = require('./StockReceiptItem')(sequelize)
const StockDisbursement  = require('./StockDisbursement')(sequelize)

// ── User associations ──────────────────────────────────────────────────────
User.hasMany(RefreshToken,  { foreignKey: 'user_id',    as: 'refreshTokens' })
User.hasMany(ActivityLog,   { foreignKey: 'user_id',    as: 'activityLogs' })
User.hasMany(DeliveryOrder, { foreignKey: 'created_by', as: 'createdSJs' })
User.hasMany(Invoice,       { foreignKey: 'created_by', as: 'createdInvoices' })
User.hasMany(Payment,       { foreignKey: 'created_by', as: 'recordedPayments' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

// ── Customer associations ──────────────────────────────────────────────────
Customer.hasMany(Project,           { foreignKey: 'customer_id', as: 'projects' })
Customer.hasMany(DeliveryOrder,     { foreignKey: 'customer_id', as: 'deliveryOrders' })
Customer.hasMany(Invoice,           { foreignKey: 'customer_id', as: 'invoices' })
Customer.hasMany(StockReceipt,      { foreignKey: 'customer_id', as: 'stockReceipts' })
Customer.hasMany(StockDisbursement, { foreignKey: 'customer_id', as: 'stockDisbursements' })

// ── Fleet associations ─────────────────────────────────────────────────────
Fleet.hasMany(DeliveryOrder, { foreignKey: 'fleet_id', as: 'deliveryOrders' })
Fleet.hasMany(InvoiceItem,   { foreignKey: 'fleet_id', as: 'invoiceItems' })

// ── Driver associations ────────────────────────────────────────────────────
Driver.hasMany(DeliveryOrder, { foreignKey: 'driver_id', as: 'deliveryOrders' })

// ── Project associations ───────────────────────────────────────────────────
Project.belongsTo(Customer,    { foreignKey: 'customer_id', as: 'customer' })
Project.hasMany(DeliveryOrder, { foreignKey: 'project_id',  as: 'deliveryOrders' })
Project.hasMany(Invoice,       { foreignKey: 'project_id',  as: 'invoices' })

// ── DeliveryOrder associations ─────────────────────────────────────────────
DeliveryOrder.belongsTo(Project,  { foreignKey: 'project_id',  as: 'project' })
DeliveryOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' })
DeliveryOrder.belongsTo(Fleet,    { foreignKey: 'fleet_id',    as: 'fleet' })
DeliveryOrder.belongsTo(Driver,   { foreignKey: 'driver_id',   as: 'driver' })
DeliveryOrder.belongsTo(Invoice,  { foreignKey: 'invoice_id',  as: 'attachedInvoice' })

// ── Invoice associations ───────────────────────────────────────────────────
Invoice.belongsTo(Project,  { foreignKey: 'project_id',  as: 'project' })
Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' })
Invoice.hasMany(InvoiceItem,   { foreignKey: 'invoice_id', as: 'items',      onDelete: 'CASCADE' })
Invoice.hasMany(Payment,       { foreignKey: 'invoice_id', as: 'payments' })
Invoice.hasMany(DeliveryOrder, { foreignKey: 'invoice_id', as: 'attachedSJs' })

// ── InvoiceItem associations ───────────────────────────────────────────────
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' })
InvoiceItem.belongsTo(Fleet,   { foreignKey: 'fleet_id',   as: 'fleet' })

// ── Payment associations ───────────────────────────────────────────────────
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' })

// ── Stock associations ─────────────────────────────────────────────────────
StockItem.hasMany(StockReceiptItem,  { foreignKey: 'stock_item_id', as: 'receiptItems' })
StockItem.hasMany(StockDisbursement, { foreignKey: 'stock_item_id', as: 'disbursements' })

StockReceipt.belongsTo(Customer,       { foreignKey: 'customer_id', as: 'customer' })
StockReceipt.hasMany(StockReceiptItem, { foreignKey: 'receipt_id',  as: 'items', onDelete: 'CASCADE' })

StockReceiptItem.belongsTo(StockReceipt, { foreignKey: 'receipt_id',    as: 'receipt' })
StockReceiptItem.belongsTo(StockItem,    { foreignKey: 'stock_item_id', as: 'stockItem' })

StockDisbursement.belongsTo(StockItem,     { foreignKey: 'stock_item_id',     as: 'stockItem' })
StockDisbursement.belongsTo(Customer,      { foreignKey: 'customer_id',       as: 'customer' })
StockDisbursement.belongsTo(DeliveryOrder, { foreignKey: 'delivery_order_id', as: 'deliveryOrder' })

module.exports = {
  sequelize,
  User,
  RefreshToken,
  Customer,
  Fleet,
  Driver,
  Project,
  DeliveryOrder,
  Invoice,
  InvoiceItem,
  Payment,
  PdfJob,
  ActivityLog,
  SystemSetting,
  StockItem,
  StockReceipt,
  StockReceiptItem,
  StockDisbursement,
}
