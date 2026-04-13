import { IStockRepository } from './IStockRepository'
import { StockItem } from '../../domain/entities/StockItem'
import { StockReceipt } from '../../domain/entities/StockReceipt'
import { StockDisbursement } from '../../domain/entities/StockDisbursement'
import { CreateStockItemDto } from '../../application/dto/CreateStockItemDto'
import { CreateStockReceiptDto } from '../../application/dto/CreateStockReceiptDto'
import { CreateStockDisbursementDto } from '../../application/dto/CreateStockDisbursementDto'
import { MOCK_STOCK_ITEMS, MOCK_STOCK_RECEIPTS, MOCK_STOCK_DISBURSEMENTS, MOCK_CUSTOMERS } from '@/lib/mockData/stock'

function simulateDelay(ms = 400): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let itemsStore: StockItem[] = [...MOCK_STOCK_ITEMS]
let receiptsStore: StockReceipt[] = [...MOCK_STOCK_RECEIPTS]
let disbursementsStore: StockDisbursement[] = [...MOCK_STOCK_DISBURSEMENTS]
let nextItemId = itemsStore.length + 1
let nextReceiptId = receiptsStore.length + 1
let nextDisbursementId = disbursementsStore.length + 1
let nextReceiptNum = receiptsStore.length + 1
let nextDisbursementNum = disbursementsStore.length + 1

class MockStockRepository implements IStockRepository {
  async getItems(): Promise<StockItem[]> {
    await simulateDelay(300)
    return [...itemsStore]
  }

  async createItem(dto: CreateStockItemDto): Promise<StockItem> {
    await simulateDelay()
    const now = new Date().toISOString()
    const item: StockItem = {
      id: nextItemId++,
      uuid: `item-stk-${Date.now()}`,
      code: dto.code.toUpperCase(),
      name: dto.name,
      category: dto.category,
      unit: dto.unit,
      description: dto.description,
      is_active: true,
      current_stock: 0,
      peak_stock: 0,
      created_by: 1,
      created_at: now,
      updated_at: now,
    }
    itemsStore = [item, ...itemsStore]
    return item
  }

  async updateItem(uuid: string, dto: Partial<CreateStockItemDto> & { is_active?: boolean }): Promise<StockItem> {
    await simulateDelay()
    const idx = itemsStore.findIndex(i => i.uuid === uuid)
    if (idx === -1) throw new Error('Barang tidak ditemukan')
    const updated: StockItem = { ...itemsStore[idx], ...dto, updated_at: new Date().toISOString() }
    itemsStore = itemsStore.map(i => i.uuid === uuid ? updated : i)
    return updated
  }

  async getReceipts(): Promise<StockReceipt[]> {
    await simulateDelay(300)
    return [...receiptsStore].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async getReceiptByUuid(uuid: string): Promise<StockReceipt | null> {
    await simulateDelay(200)
    return receiptsStore.find(r => r.uuid === uuid) ?? null
  }

  async createReceipt(dto: CreateStockReceiptDto): Promise<StockReceipt> {
    await simulateDelay()
    const now = new Date().toISOString()
    const year = new Date(dto.receipt_date).getFullYear()
    const receiptNumber = `STK-MSK-${year}-${String(nextReceiptNum++).padStart(3, '0')}`
    const customer = dto.customer_id ? MOCK_CUSTOMERS.find(c => c.id === dto.customer_id) ?? null : null

    const receiptId = nextReceiptId
    const items = dto.items.map((item, idx) => {
      const stockItem = itemsStore.find(i => i.id === item.stock_item_id)!
      return {
        id: receiptId * 100 + idx,
        uuid: `ri-${Date.now()}-${idx}`,
        receipt_id: receiptId,
        stock_item_id: item.stock_item_id,
        stock_item: stockItem,
        qty: item.qty,
        notes: item.notes,
        kategori_name: item.kategori_name ?? null,
      }
    })

    // Update stock
    items.forEach(item => {
      itemsStore = itemsStore.map(si => {
        if (si.id === item.stock_item_id) {
          const newStock = si.current_stock + item.qty
          return { ...si, current_stock: newStock, peak_stock: Math.max(si.peak_stock, newStock), updated_at: now }
        }
        return si
      })
    })

    const receipt: StockReceipt = {
      id: nextReceiptId++,
      uuid: `rcpt-${Date.now()}`,
      receipt_number: receiptNumber,
      receipt_date: dto.receipt_date,
      supplier_name: dto.supplier_name,
      document_number: dto.document_number,
      customer_id: dto.customer_id,
      customer,
      notes: dto.notes,
      items,
      created_by: 1,
      created_by_name: 'Admin Ops PNJ',
      created_at: now,
      updated_at: now,
    }
    receiptsStore = [receipt, ...receiptsStore]
    return receipt
  }

  async deleteReceipt(uuid: string): Promise<void> {
    await simulateDelay()
    const receipt = receiptsStore.find(r => r.uuid === uuid)
    if (!receipt) throw new Error('Receipt tidak ditemukan')
    const now = new Date().toISOString()
    // Rollback stock
    receipt.items.forEach(item => {
      itemsStore = itemsStore.map(si => {
        if (si.id === item.stock_item_id) {
          return { ...si, current_stock: Math.max(0, si.current_stock - item.qty), updated_at: now }
        }
        return si
      })
    })
    receiptsStore = receiptsStore.filter(r => r.uuid !== uuid)
  }

  async getDisbursements(): Promise<StockDisbursement[]> {
    await simulateDelay(300)
    return [...disbursementsStore].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async getDisbursementByUuid(uuid: string): Promise<StockDisbursement | null> {
    await simulateDelay(200)
    return disbursementsStore.find(d => d.uuid === uuid) ?? null
  }

  async createDisbursement(dto: CreateStockDisbursementDto): Promise<StockDisbursement> {
    await simulateDelay()
    const now = new Date().toISOString()
    const year = new Date(dto.disbursement_date).getFullYear()
    const disbNumber = `STK-KLR-${year}-${String(nextDisbursementNum++).padStart(3, '0')}`
    const stockItem = itemsStore.find(i => i.id === dto.stock_item_id)!
    const customer = dto.customer_id ? MOCK_CUSTOMERS.find(c => c.id === dto.customer_id) ?? null : null

    // Update stock
    itemsStore = itemsStore.map(si => {
      if (si.id === dto.stock_item_id) {
        return { ...si, current_stock: si.current_stock - dto.qty, updated_at: now }
      }
      return si
    })

    const disb: StockDisbursement = {
      id: nextDisbursementId++,
      uuid: `disb-${Date.now()}`,
      disbursement_number: disbNumber,
      disbursement_date: dto.disbursement_date,
      stock_item_id: dto.stock_item_id,
      stock_item: { ...stockItem, current_stock: stockItem.current_stock - dto.qty },
      qty: dto.qty,
      delivery_order_id: dto.delivery_order_id,
      delivery_order: null,
      sj_number_manual: dto.sj_number_manual,
      invoice_number_manual: dto.invoice_number_manual,
      driver_name: dto.driver_name,
      vehicle_plate: dto.vehicle_plate,
      destination: dto.destination,
      customer_id: dto.customer_id,
      customer,
      notes: dto.notes,
      created_by: 1,
      created_by_name: 'Admin Ops PNJ',
      created_at: now,
      updated_at: now,
    }
    disbursementsStore = [disb, ...disbursementsStore]
    return disb
  }

  async deleteDisbursement(uuid: string): Promise<void> {
    await simulateDelay()
    const disb = disbursementsStore.find(d => d.uuid === uuid)
    if (!disb) throw new Error('Data keluar tidak ditemukan')
    const now = new Date().toISOString()
    // Rollback stock (add back)
    itemsStore = itemsStore.map(si => {
      if (si.id === disb.stock_item_id) {
        return { ...si, current_stock: si.current_stock + disb.qty, updated_at: now }
      }
      return si
    })
    disbursementsStore = disbursementsStore.filter(d => d.uuid !== uuid)
  }
}

export const stockRepository = new MockStockRepository()
