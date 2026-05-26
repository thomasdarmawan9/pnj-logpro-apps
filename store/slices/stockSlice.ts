import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { StockItem } from '@/features/stock/domain/entities/StockItem'
import { StockReceipt } from '@/features/stock/domain/entities/StockReceipt'
import { StockDisbursement } from '@/features/stock/domain/entities/StockDisbursement'
import { CustomerStockSummary } from '@/features/stock/application/use-cases/GetCustomerStockDetail'
import { StockFilters } from '@/features/stock/domain/value-objects/StockBalance'
import { stockRepository } from '@/features/stock/infrastructure/repositories/MockStockRepository'
import { CreateStockItemDto } from '@/features/stock/application/dto/CreateStockItemDto'
import { CreateStockReceiptDto } from '@/features/stock/application/dto/CreateStockReceiptDto'
import { CreateStockDisbursementDto } from '@/features/stock/application/dto/CreateStockDisbursementDto'

interface StockState {
  items: StockItem[]
  receipts: StockReceipt[]
  disbursements: StockDisbursement[]
  selectedReceipt: StockReceipt | null
  selectedDisbursement: StockDisbursement | null
  customerSummaries: CustomerStockSummary[]
  selectedCustomerStock: CustomerStockSummary | null
  filters: StockFilters
  isLoading: boolean
  isDetailLoading: boolean
  isSubmitting: boolean
  error: string | null
  modals: {
    addItem: boolean
    editItem: { open: boolean; item: StockItem | null }
    deleteConfirm: { open: boolean; type: 'receipt' | 'disbursement' | null; uuid: string | null }
  }
}

const defaultFilters: StockFilters = {
  search: '',
  itemId: null,
  period: 'this_month',
  periodFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  periodTo: new Date().toISOString().split('T')[0],
  customerId: null,
}

const initialState: StockState = {
  items: [],
  receipts: [],
  disbursements: [],
  selectedReceipt: null,
  selectedDisbursement: null,
  customerSummaries: [],
  selectedCustomerStock: null,
  filters: defaultFilters,
  isLoading: false,
  isDetailLoading: false,
  isSubmitting: false,
  error: null,
  modals: {
    addItem: false,
    editItem: { open: false, item: null },
    deleteConfirm: { open: false, type: null, uuid: null },
  },
}

export const fetchStockItems = createAsyncThunk('stock/fetchItems', async (_, { rejectWithValue }) => {
  try { return await stockRepository.getItems() } catch { return rejectWithValue('Gagal memuat data barang') }
})

export const createStockItem = createAsyncThunk('stock/createItem', async (dto: CreateStockItemDto, { rejectWithValue }) => {
  try { return await stockRepository.createItem(dto) } catch { return rejectWithValue('Gagal menambah barang') }
})

export const updateStockItem = createAsyncThunk('stock/updateItem', async ({ uuid, dto }: { uuid: string; dto: Partial<CreateStockItemDto> & { is_active?: boolean } }, { rejectWithValue }) => {
  try { return await stockRepository.updateItem(uuid, dto) } catch { return rejectWithValue('Gagal memperbarui barang') }
})

export const fetchStockReceipts = createAsyncThunk('stock/fetchReceipts', async (_, { rejectWithValue }) => {
  try { return await stockRepository.getReceipts() } catch { return rejectWithValue('Gagal memuat data stok masuk') }
})

export const fetchReceiptDetail = createAsyncThunk('stock/fetchReceiptDetail', async (uuid: string, { rejectWithValue }) => {
  try {
    const r = await stockRepository.getReceiptByUuid(uuid)
    if (!r) return rejectWithValue('Receipt tidak ditemukan')
    return r
  } catch { return rejectWithValue('Gagal memuat detail receipt') }
})

export const createStockReceipt = createAsyncThunk('stock/createReceipt', async (dto: CreateStockReceiptDto, { rejectWithValue }) => {
  try { return await stockRepository.createReceipt(dto) } catch { return rejectWithValue('Gagal menyimpan stok masuk') }
})

export const deleteStockReceipt = createAsyncThunk('stock/deleteReceipt', async (uuid: string, { rejectWithValue }) => {
  try { await stockRepository.deleteReceipt(uuid); return uuid } catch { return rejectWithValue('Gagal menghapus stok masuk') }
})

export const fetchStockDisbursements = createAsyncThunk('stock/fetchDisbursements', async (_, { rejectWithValue }) => {
  try { return await stockRepository.getDisbursements() } catch { return rejectWithValue('Gagal memuat data stok keluar') }
})

export const fetchDisbursementDetail = createAsyncThunk('stock/fetchDisbursementDetail', async (uuid: string, { rejectWithValue }) => {
  try {
    const d = await stockRepository.getDisbursementByUuid(uuid)
    if (!d) return rejectWithValue('Data keluar tidak ditemukan')
    return d
  } catch { return rejectWithValue('Gagal memuat detail stok keluar') }
})

export const createStockDisbursement = createAsyncThunk('stock/createDisbursement', async (dto: CreateStockDisbursementDto, { rejectWithValue }) => {
  try { return await stockRepository.createDisbursement(dto) } catch { return rejectWithValue('Gagal menyimpan stok keluar') }
})

export const deleteStockDisbursement = createAsyncThunk('stock/deleteDisbursement', async (uuid: string, { rejectWithValue }) => {
  try { await stockRepository.deleteDisbursement(uuid); return uuid } catch { return rejectWithValue('Gagal menghapus stok keluar') }
})

export const fetchCustomerStockSummaries = createAsyncThunk('stock/fetchCustomerStockSummaries', async (_, { rejectWithValue }) => {
  try { return await stockRepository.getCustomerStockSummaries() } catch { return rejectWithValue('Gagal memuat rekap stok customer') }
})

export const fetchCustomerStockDetail = createAsyncThunk('stock/fetchCustomerStockDetail', async (uuid: string, { rejectWithValue }) => {
  try { return await stockRepository.getCustomerStockDetail(uuid) } catch { return rejectWithValue('Gagal memuat detail stok customer') }
})

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<StockFilters>>) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) { state.filters = defaultFilters },
    openAddItemModal(state) { state.modals.addItem = true },
    closeAddItemModal(state) { state.modals.addItem = false },
    openEditItemModal(state, action: PayloadAction<StockItem>) {
      state.modals.editItem = { open: true, item: action.payload }
    },
    closeEditItemModal(state) { state.modals.editItem = { open: false, item: null } },
    openDeleteConfirm(state, action: PayloadAction<{ type: 'receipt' | 'disbursement'; uuid: string }>) {
      state.modals.deleteConfirm = { open: true, ...action.payload }
    },
    closeDeleteConfirm(state) { state.modals.deleteConfirm = { open: false, type: null, uuid: null } },
    clearError(state) { state.error = null },
    clearSelectedReceipt(state) { state.selectedReceipt = null },
    clearSelectedDisbursement(state) { state.selectedDisbursement = null },
    clearSelectedCustomerStock(state) { state.selectedCustomerStock = null },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchStockItems.pending, state => { state.isLoading = true; state.error = null })
      .addCase(fetchStockItems.fulfilled, (state, action) => { state.isLoading = false; state.items = action.payload })
      .addCase(fetchStockItems.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
      .addCase(createStockItem.pending, state => { state.isSubmitting = true })
      .addCase(createStockItem.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.items = [action.payload, ...state.items]
        state.modals.addItem = false
      })
      .addCase(createStockItem.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload as string })
      .addCase(updateStockItem.pending, state => { state.isSubmitting = true })
      .addCase(updateStockItem.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.items = state.items.map(i => i.uuid === action.payload.uuid ? action.payload : i)
        state.modals.editItem = { open: false, item: null }
      })
      .addCase(updateStockItem.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload as string })
      .addCase(fetchStockReceipts.pending, state => { state.isLoading = true })
      .addCase(fetchStockReceipts.fulfilled, (state, action) => { state.isLoading = false; state.receipts = action.payload })
      .addCase(fetchStockReceipts.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
      .addCase(fetchReceiptDetail.pending, state => { state.isDetailLoading = true })
      .addCase(fetchReceiptDetail.fulfilled, (state, action) => { state.isDetailLoading = false; state.selectedReceipt = action.payload })
      .addCase(fetchReceiptDetail.rejected, (state, action) => { state.isDetailLoading = false; state.error = action.payload as string })
      .addCase(createStockReceipt.pending, state => { state.isSubmitting = true })
      .addCase(createStockReceipt.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.receipts = [action.payload, ...state.receipts]
        action.payload.items.forEach(item => {
          state.items = state.items.map(si =>
            si.id === item.stock_item_id
              ? { ...si, current_stock: si.current_stock + item.qty, peak_stock: Math.max(si.peak_stock, si.current_stock + item.qty) }
              : si
          )
        })
      })
      .addCase(createStockReceipt.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload as string })
      .addCase(deleteStockReceipt.fulfilled, (state, action) => {
        const deleted = state.receipts.find(r => r.uuid === action.payload)
        if (deleted) {
          deleted.items.forEach(item => {
            state.items = state.items.map(si =>
              si.id === item.stock_item_id ? { ...si, current_stock: Math.max(0, si.current_stock - item.qty) } : si
            )
          })
        }
        state.receipts = state.receipts.filter(r => r.uuid !== action.payload)
        state.modals.deleteConfirm = { open: false, type: null, uuid: null }
      })
      .addCase(fetchStockDisbursements.pending, state => { state.isLoading = true })
      .addCase(fetchStockDisbursements.fulfilled, (state, action) => { state.isLoading = false; state.disbursements = action.payload })
      .addCase(fetchStockDisbursements.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
      .addCase(fetchDisbursementDetail.pending, state => { state.isDetailLoading = true })
      .addCase(fetchDisbursementDetail.fulfilled, (state, action) => { state.isDetailLoading = false; state.selectedDisbursement = action.payload })
      .addCase(fetchDisbursementDetail.rejected, (state, action) => { state.isDetailLoading = false; state.error = action.payload as string })
      .addCase(createStockDisbursement.pending, state => { state.isSubmitting = true })
      .addCase(createStockDisbursement.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.disbursements = [action.payload, ...state.disbursements]
        state.items = state.items.map(si =>
          si.id === action.payload.stock_item_id ? { ...si, current_stock: si.current_stock - action.payload.qty } : si
        )
      })
      .addCase(createStockDisbursement.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload as string })
      .addCase(deleteStockDisbursement.fulfilled, (state, action) => {
        const deleted = state.disbursements.find(d => d.uuid === action.payload)
        if (deleted) {
          state.items = state.items.map(si =>
            si.id === deleted.stock_item_id ? { ...si, current_stock: si.current_stock + deleted.qty } : si
          )
        }
        state.disbursements = state.disbursements.filter(d => d.uuid !== action.payload)
        state.modals.deleteConfirm = { open: false, type: null, uuid: null }
      })
      .addCase(fetchCustomerStockSummaries.pending, state => { state.isLoading = true })
      .addCase(fetchCustomerStockSummaries.fulfilled, (state, action) => {
        state.isLoading = false
        state.customerSummaries = action.payload
      })
      .addCase(fetchCustomerStockSummaries.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
      .addCase(fetchCustomerStockDetail.pending, state => { state.isDetailLoading = true; state.selectedCustomerStock = null })
      .addCase(fetchCustomerStockDetail.fulfilled, (state, action) => {
        state.isDetailLoading = false
        state.selectedCustomerStock = action.payload
      })
      .addCase(fetchCustomerStockDetail.rejected, (state, action) => { state.isDetailLoading = false; state.error = action.payload as string })
  },
})

export const {
  setFilters, resetFilters,
  openAddItemModal, closeAddItemModal,
  openEditItemModal, closeEditItemModal,
  openDeleteConfirm, closeDeleteConfirm,
  clearError, clearSelectedReceipt, clearSelectedDisbursement, clearSelectedCustomerStock,
} = stockSlice.actions

export default stockSlice.reducer
