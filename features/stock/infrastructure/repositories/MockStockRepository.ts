import { apiRequest } from '@/lib/apiClient'
import { IStockRepository } from './IStockRepository'
import { StockItem } from '../../domain/entities/StockItem'
import { StockReceipt, StockReceiptItem } from '../../domain/entities/StockReceipt'
import { StockDisbursement } from '../../domain/entities/StockDisbursement'
import { CreateStockItemDto } from '../../application/dto/CreateStockItemDto'
import { CreateStockReceiptDto, CreateStockReceiptItemDto } from '../../application/dto/CreateStockReceiptDto'
import { CreateStockDisbursementDto } from '../../application/dto/CreateStockDisbursementDto'

type ApiId = number | string | null

type ApiCustomer = { id: ApiId; uuid?: string; name: string } | null
type ApiStockItem = Omit<StockItem, 'id' | 'current_stock' | 'peak_stock' | 'created_by'> & {
  id: ApiId
  current_stock: number | string
  peak_stock: number | string
  created_by: ApiId
}
type ApiReceiptItem = Omit<StockReceiptItem, 'id' | 'receipt_id' | 'stock_item_id' | 'qty' | 'stock_item'> & {
  id: ApiId
  receipt_id: ApiId
  stock_item_id: ApiId
  qty: number | string
  stock_item: ApiStockItem
}
type ApiReceipt = Omit<StockReceipt, 'id' | 'customer_id' | 'created_by' | 'items' | 'customer'> & {
  id: ApiId
  customer_id: ApiId
  customer?: ApiCustomer
  created_by: ApiId
  items: ApiReceiptItem[]
}
type ApiDisbursement = Omit<
  StockDisbursement,
  'id' | 'stock_item_id' | 'stock_item' | 'qty' | 'delivery_order_id' | 'customer_id' | 'customer' | 'created_by'
> & {
  id: ApiId
  stock_item_id: ApiId
  stock_item: ApiStockItem
  qty: number | string
  delivery_order_id: ApiId
  customer_id: ApiId
  customer?: ApiCustomer
  created_by: ApiId
}

function toNumber(value: ApiId | undefined): number {
  return Number(value || 0)
}

function toNullableNumber(value: ApiId | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function normalizeCustomer(customer: ApiCustomer): { id: number; name: string } | null {
  if (!customer) return null
  return { id: toNumber(customer.id), name: customer.name }
}

function normalizeItem(item: ApiStockItem): StockItem {
  return {
    ...item,
    id: toNumber(item.id),
    current_stock: Number(item.current_stock || 0),
    peak_stock: Number(item.peak_stock || 0),
    created_by: toNumber(item.created_by),
  }
}

function normalizeReceiptItem(item: ApiReceiptItem): StockReceiptItem {
  return {
    ...item,
    id: toNumber(item.id),
    receipt_id: toNumber(item.receipt_id),
    stock_item_id: toNumber(item.stock_item_id),
    qty: Number(item.qty || 0),
    stock_item: normalizeItem(item.stock_item),
  }
}

function normalizeReceipt(receipt: ApiReceipt): StockReceipt {
  return {
    ...receipt,
    id: toNumber(receipt.id),
    customer_id: toNullableNumber(receipt.customer_id),
    customer: normalizeCustomer(receipt.customer ?? null),
    items: (receipt.items || []).map(normalizeReceiptItem),
    created_by: toNumber(receipt.created_by),
    created_by_name: receipt.created_by_name || 'Admin Ops PNJ',
  }
}

function normalizeDisbursement(disbursement: ApiDisbursement): StockDisbursement {
  return {
    ...disbursement,
    id: toNumber(disbursement.id),
    stock_item_id: toNumber(disbursement.stock_item_id),
    stock_item: normalizeItem(disbursement.stock_item),
    qty: Number(disbursement.qty || 0),
    delivery_order_id: toNullableNumber(disbursement.delivery_order_id),
    customer_id: toNullableNumber(disbursement.customer_id),
    customer: normalizeCustomer(disbursement.customer ?? null),
    created_by: toNumber(disbursement.created_by),
    created_by_name: disbursement.created_by_name || 'Admin Ops PNJ',
  }
}

function receiptItemPayload(item: CreateStockReceiptItemDto) {
  return {
    stock_item_id: item.stock_item_id,
    qty: item.qty,
    kategori_name: item.kategori_name ?? null,
    notes: item.notes ?? null,
  }
}

class MockStockRepository implements IStockRepository {
  async getItems(): Promise<StockItem[]> {
    const response = await apiRequest<ApiStockItem[]>('/stock/items?page=1&limit=100', { method: 'GET' })
    return response.data.map(normalizeItem)
  }

  async createItem(dto: CreateStockItemDto): Promise<StockItem> {
    const response = await apiRequest<ApiStockItem>('/stock/items', {
      method: 'POST',
      body: dto,
    })
    return normalizeItem(response.data)
  }

  async updateItem(uuid: string, dto: Partial<CreateStockItemDto> & { is_active?: boolean }): Promise<StockItem> {
    const response = await apiRequest<ApiStockItem>(`/stock/items/${uuid}`, {
      method: 'PUT',
      body: dto,
    })
    return normalizeItem(response.data)
  }

  async getReceipts(): Promise<StockReceipt[]> {
    const response = await apiRequest<ApiReceipt[]>('/stock/receipts?period=all&page=1&limit=100', { method: 'GET' })
    return response.data.map(normalizeReceipt)
  }

  async getReceiptByUuid(uuid: string): Promise<StockReceipt | null> {
    const response = await apiRequest<ApiReceipt>(`/stock/receipts/${uuid}`, { method: 'GET' })
    return normalizeReceipt(response.data)
  }

  async createReceipt(dto: CreateStockReceiptDto): Promise<StockReceipt> {
    const response = await apiRequest<ApiReceipt>('/stock/receipts', {
      method: 'POST',
      body: {
        receipt_date: dto.receipt_date,
        supplier_name: dto.supplier_name,
        document_number: dto.document_number,
        customer_id: dto.customer_id,
        notes: dto.notes,
        items: dto.items.map(receiptItemPayload),
      },
    })
    return normalizeReceipt(response.data)
  }

  async deleteReceipt(uuid: string): Promise<void> {
    await apiRequest<null>(`/stock/receipts/${uuid}`, { method: 'DELETE' })
  }

  async getDisbursements(): Promise<StockDisbursement[]> {
    const response = await apiRequest<ApiDisbursement[]>('/stock/disbursements?period=all&page=1&limit=100', { method: 'GET' })
    return response.data.map(normalizeDisbursement)
  }

  async getDisbursementByUuid(uuid: string): Promise<StockDisbursement | null> {
    const response = await apiRequest<ApiDisbursement>(`/stock/disbursements/${uuid}`, { method: 'GET' })
    return normalizeDisbursement(response.data)
  }

  async createDisbursement(dto: CreateStockDisbursementDto): Promise<StockDisbursement> {
    const response = await apiRequest<ApiDisbursement>('/stock/disbursements', {
      method: 'POST',
      body: {
        disbursement_date: dto.disbursement_date,
        stock_item_id: dto.stock_item_id,
        qty: dto.qty,
        delivery_order_id: dto.delivery_order_id,
        sj_number_manual: dto.sj_number_manual,
        invoice_number_manual: dto.invoice_number_manual,
        driver_name: dto.driver_name,
        vehicle_plate: dto.vehicle_plate,
        destination: dto.destination,
        customer_id: dto.customer_id,
        notes: dto.notes,
      },
    })
    return normalizeDisbursement(response.data)
  }

  async deleteDisbursement(uuid: string): Promise<void> {
    await apiRequest<null>(`/stock/disbursements/${uuid}`, { method: 'DELETE' })
  }
}

export const stockRepository = new MockStockRepository()
