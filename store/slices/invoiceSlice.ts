import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Invoice, InvoiceFilterState, PaginationState, AttachedSJ } from '../../features/invoice/domain/entities/Invoice'
import { invoiceRepository } from '../../features/invoice/infrastructure/repositories/MockInvoiceRepository'
import { CreateInvoiceDto } from '../../features/invoice/application/dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../../features/invoice/application/dto/UpdateInvoiceDto'
import { RecordPaymentDto } from '../../features/invoice/application/dto/RecordPaymentDto'

interface InvoiceState {
  list: Invoice[]
  selectedInvoice: Invoice | null
  attachableSJ: AttachedSJ[]
  filters: InvoiceFilterState
  pagination: PaginationState
  isLoading: boolean
  isDetailLoading: boolean
  isSubmitting: boolean
  error: string | null
  modals: {
    attachSJ: boolean
    detachSJ: { open: boolean; sjUuid: string | null }
    recordPayment: boolean
    sendInvoice: boolean
    voidInvoice: boolean
    generatePDF: boolean
  }
  pdfJob: {
    status: 'idle' | 'pending' | 'processing' | 'done' | 'failed'
    fileUrl: string | null
  }
}

const defaultFilters: InvoiceFilterState = {
  search: '',
  status: 'all',
  customer: 'all',
  proyek: 'all',
  periode: 'all',
}

const initialState: InvoiceState = {
  list: [],
  selectedInvoice: null,
  attachableSJ: [],
  filters: defaultFilters,
  pagination: { page: 1, perPage: 12, total: 0 },
  isLoading: false,
  isDetailLoading: false,
  isSubmitting: false,
  error: null,
  modals: {
    attachSJ: false,
    detachSJ: { open: false, sjUuid: null },
    recordPayment: false,
    sendInvoice: false,
    voidInvoice: false,
    generatePDF: false,
  },
  pdfJob: { status: 'idle', fileUrl: null },
}

export const fetchInvoiceList = createAsyncThunk(
  'invoice/fetchList',
  async (_, { getState, rejectWithValue }) => {
    const state = (getState() as { invoice: InvoiceState }).invoice
    try {
      return await invoiceRepository.getList(state.filters, state.pagination)
    } catch {
      return rejectWithValue('Gagal memuat data invoice')
    }
  }
)

export const fetchInvoiceDetail = createAsyncThunk(
  'invoice/fetchDetail',
  async (uuid: string, { rejectWithValue }) => {
    try {
      const inv = await invoiceRepository.getByUuid(uuid)
      if (!inv) return rejectWithValue('Invoice tidak ditemukan')
      return inv
    } catch {
      return rejectWithValue('Gagal memuat detail invoice')
    }
  }
)

export const createInvoice = createAsyncThunk(
  'invoice/create',
  async (dto: CreateInvoiceDto, { rejectWithValue }) => {
    try {
      return await invoiceRepository.create(dto)
    } catch {
      return rejectWithValue('Gagal membuat invoice')
    }
  }
)

export const updateInvoice = createAsyncThunk(
  'invoice/update',
  async ({ uuid, dto }: { uuid: string; dto: UpdateInvoiceDto }, { rejectWithValue }) => {
    try {
      return await invoiceRepository.update(uuid, dto)
    } catch {
      return rejectWithValue('Gagal memperbarui invoice')
    }
  }
)

export const sendInvoice = createAsyncThunk(
  'invoice/send',
  async (uuid: string, { rejectWithValue }) => {
    try {
      return await invoiceRepository.send(uuid)
    } catch {
      return rejectWithValue('Gagal mengirim invoice')
    }
  }
)

export const recordPayment = createAsyncThunk(
  'invoice/recordPayment',
  async ({ uuid, dto }: { uuid: string; dto: RecordPaymentDto }, { rejectWithValue }) => {
    try {
      return await invoiceRepository.recordPayment(uuid, dto)
    } catch {
      return rejectWithValue('Gagal mencatat pembayaran')
    }
  }
)

export const voidInvoice = createAsyncThunk(
  'invoice/void',
  async ({ uuid, reason }: { uuid: string; reason: string }, { rejectWithValue }) => {
    try {
      return await invoiceRepository.void(uuid, reason)
    } catch {
      return rejectWithValue('Gagal void invoice')
    }
  }
)

export const attachSJ = createAsyncThunk(
  'invoice/attachSJ',
  async ({ invoiceUuid, sjUuids }: { invoiceUuid: string; sjUuids: string[] }, { rejectWithValue }) => {
    try {
      return await invoiceRepository.attachSJ(invoiceUuid, sjUuids)
    } catch {
      return rejectWithValue('Gagal melampirkan SJ')
    }
  }
)

export const detachSJ = createAsyncThunk(
  'invoice/detachSJ',
  async ({ invoiceUuid, sjUuid }: { invoiceUuid: string; sjUuid: string }, { rejectWithValue }) => {
    try {
      return await invoiceRepository.detachSJ(invoiceUuid, sjUuid)
    } catch {
      return rejectWithValue('Gagal melepas SJ')
    }
  }
)

export const fetchAttachableSJ = createAsyncThunk(
  'invoice/fetchAttachableSJ',
  async (projectCode: string, { rejectWithValue }) => {
    try {
      return await invoiceRepository.getAttachableSJ(projectCode)
    } catch {
      return rejectWithValue('Gagal memuat SJ tersedia')
    }
  }
)

function updateInvoiceInList(list: Invoice[], updated: Invoice): Invoice[] {
  return list.map(inv => inv.uuid === updated.uuid ? updated : inv)
}

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<InvoiceFilterState>>) {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1
    },
    resetFilters(state) {
      state.filters = defaultFilters
      state.pagination.page = 1
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload
    },
    setPerPage(state, action: PayloadAction<number>) {
      state.pagination.perPage = action.payload
      state.pagination.page = 1
    },
    openAttachSJModal(state) { state.modals.attachSJ = true },
    closeAttachSJModal(state) { state.modals.attachSJ = false },
    openDetachSJModal(state, action: PayloadAction<string>) {
      state.modals.detachSJ = { open: true, sjUuid: action.payload }
    },
    closeDetachSJModal(state) {
      state.modals.detachSJ = { open: false, sjUuid: null }
    },
    openRecordPaymentModal(state) { state.modals.recordPayment = true },
    closeRecordPaymentModal(state) { state.modals.recordPayment = false },
    openSendInvoiceModal(state) { state.modals.sendInvoice = true },
    closeSendInvoiceModal(state) { state.modals.sendInvoice = false },
    openVoidInvoiceModal(state) { state.modals.voidInvoice = true },
    closeVoidInvoiceModal(state) { state.modals.voidInvoice = false },
    openGeneratePDFModal(state) { state.modals.generatePDF = true },
    closeGeneratePDFModal(state) {
      state.modals.generatePDF = false
      state.pdfJob = { status: 'idle', fileUrl: null }
    },
    setPdfJob(state, action: PayloadAction<Partial<InvoiceState['pdfJob']>>) {
      state.pdfJob = { ...state.pdfJob, ...action.payload }
    },
    clearSelectedInvoice(state) { state.selectedInvoice = null },
    clearError(state) { state.error = null },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchInvoiceList.pending, state => { state.isLoading = true; state.error = null })
      .addCase(fetchInvoiceList.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.data
        state.pagination.total = action.payload.total
      })
      .addCase(fetchInvoiceList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchInvoiceDetail.pending, state => { state.isDetailLoading = true })
      .addCase(fetchInvoiceDetail.fulfilled, (state, action) => {
        state.isDetailLoading = false
        state.selectedInvoice = action.payload
      })
      .addCase(fetchInvoiceDetail.rejected, (state, action) => {
        state.isDetailLoading = false
        state.error = action.payload as string
      })
      .addCase(createInvoice.pending, state => { state.isSubmitting = true })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.list = [action.payload, ...state.list]
        state.pagination.total += 1
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.isSubmitting = false
        state.error = action.payload as string
      })
      .addCase(updateInvoice.pending, state => { state.isSubmitting = true })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.list = updateInvoiceInList(state.list, action.payload)
        if (state.selectedInvoice?.uuid === action.payload.uuid) state.selectedInvoice = action.payload
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.isSubmitting = false
        state.error = action.payload as string
      })
      .addCase(sendInvoice.fulfilled, (state, action) => {
        state.list = updateInvoiceInList(state.list, action.payload)
        if (state.selectedInvoice?.uuid === action.payload.uuid) state.selectedInvoice = action.payload
        state.modals.sendInvoice = false
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.list = updateInvoiceInList(state.list, action.payload)
        if (state.selectedInvoice?.uuid === action.payload.uuid) state.selectedInvoice = action.payload
        state.modals.recordPayment = false
      })
      .addCase(voidInvoice.fulfilled, (state, action) => {
        state.list = updateInvoiceInList(state.list, action.payload)
        if (state.selectedInvoice?.uuid === action.payload.uuid) state.selectedInvoice = action.payload
        state.modals.voidInvoice = false
      })
      .addCase(attachSJ.fulfilled, (state, action) => {
        state.list = updateInvoiceInList(state.list, action.payload)
        if (state.selectedInvoice?.uuid === action.payload.uuid) state.selectedInvoice = action.payload
        state.modals.attachSJ = false
      })
      .addCase(detachSJ.fulfilled, (state, action) => {
        state.list = updateInvoiceInList(state.list, action.payload)
        if (state.selectedInvoice?.uuid === action.payload.uuid) state.selectedInvoice = action.payload
        state.modals.detachSJ = { open: false, sjUuid: null }
      })
      .addCase(fetchAttachableSJ.fulfilled, (state, action) => {
        state.attachableSJ = action.payload
      })
  },
})

export const {
  setFilters, resetFilters, setPage, setPerPage,
  openAttachSJModal, closeAttachSJModal,
  openDetachSJModal, closeDetachSJModal,
  openRecordPaymentModal, closeRecordPaymentModal,
  openSendInvoiceModal, closeSendInvoiceModal,
  openVoidInvoiceModal, closeVoidInvoiceModal,
  openGeneratePDFModal, closeGeneratePDFModal,
  setPdfJob, clearSelectedInvoice, clearError,
} = invoiceSlice.actions

export default invoiceSlice.reducer
