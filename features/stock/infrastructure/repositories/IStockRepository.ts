import { StockItem } from '../../domain/entities/StockItem'
import { StockReceipt } from '../../domain/entities/StockReceipt'
import { StockDisbursement } from '../../domain/entities/StockDisbursement'
import { CustomerStockAvailableItem, CustomerStockSummary } from '../../application/use-cases/GetCustomerStockDetail'
import { CreateStockItemDto } from '../../application/dto/CreateStockItemDto'
import { CreateStockReceiptDto, UpdateStockReceiptDto } from '../../application/dto/CreateStockReceiptDto'
import { CreateStockDisbursementDto } from '../../application/dto/CreateStockDisbursementDto'

export interface IStockRepository {
  // Items
  getItems(): Promise<StockItem[]>
  createItem(dto: CreateStockItemDto): Promise<StockItem>
  updateItem(uuid: string, dto: Partial<CreateStockItemDto> & { is_active?: boolean }): Promise<StockItem>
  deleteItem(uuid: string): Promise<void>

  // Receipts
  getReceipts(): Promise<StockReceipt[]>
  getReceiptByUuid(uuid: string): Promise<StockReceipt | null>
  createReceipt(dto: CreateStockReceiptDto): Promise<StockReceipt>
  updateReceipt(uuid: string, dto: UpdateStockReceiptDto): Promise<StockReceipt>
  deleteReceipt(uuid: string): Promise<void>

  // Disbursements
  getDisbursements(): Promise<StockDisbursement[]>
  getDisbursementByUuid(uuid: string): Promise<StockDisbursement | null>
  createDisbursement(dto: CreateStockDisbursementDto): Promise<StockDisbursement>
  updateDisbursement(uuid: string, dto: Partial<CreateStockDisbursementDto>): Promise<StockDisbursement>
  deleteDisbursement(uuid: string): Promise<void>

  // Customer stock
  getCustomerStockSummaries(): Promise<CustomerStockSummary[]>
  getCustomerStockDetail(uuid: string): Promise<CustomerStockSummary>
  getCustomerAvailableItems(uuid: string): Promise<CustomerStockAvailableItem[]>
}
