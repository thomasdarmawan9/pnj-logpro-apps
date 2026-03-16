import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { SuratJalan, SJFilterState, PaginationState } from '../../features/surat-jalan/domain/entities/SuratJalan'
import { suratJalanRepository } from '../../features/surat-jalan/infrastructure/repositories/MockSuratJalanRepository'
import { AssignSJInput } from '../../features/surat-jalan/application/use-cases/AssignSuratJalan'
import { DeliverSJInput } from '../../features/surat-jalan/application/use-cases/DeliverSuratJalan'
import { CreateSJDto } from '../../features/surat-jalan/application/dto/CreateSJDto'
import { UpdateSJDto } from '../../features/surat-jalan/application/dto/UpdateSJDto'

interface SuratJalanState {
  list: SuratJalan[]
  selectedSJ: SuratJalan | null
  filters: SJFilterState
  pagination: PaginationState
  isLoading: boolean
  isDetailLoading: boolean
  error: string | null
  isVoidModalOpen: boolean
  isUploadPODModalOpen: boolean
  isDetailDrawerOpen: boolean
  isAssignModalOpen: boolean
  isGeneratePDFModalOpen: boolean
  selectedUuid: string | null
}

const defaultFilters: SJFilterState = {
  search: '',
  statusOps: 'all',
  statusLampiran: 'all',
  proyek: 'all',
  customer: 'all',
  periode: 'month',
}

const initialState: SuratJalanState = {
  list: [],
  selectedSJ: null,
  filters: defaultFilters,
  pagination: { page: 1, perPage: 15, total: 0 },
  isLoading: false,
  isDetailLoading: false,
  error: null,
  isVoidModalOpen: false,
  isUploadPODModalOpen: false,
  isDetailDrawerOpen: false,
  isAssignModalOpen: false,
  isGeneratePDFModalOpen: false,
  selectedUuid: null,
}

export const fetchSuratJalanList = createAsyncThunk(
  'suratJalan/fetchList',
  async (_, { getState, rejectWithValue }) => {
    const state = (getState() as { suratJalan: SuratJalanState }).suratJalan
    try {
      return await suratJalanRepository.getList(state.filters, state.pagination)
    } catch {
      return rejectWithValue('Gagal memuat data surat jalan')
    }
  }
)

export const fetchSuratJalanDetail = createAsyncThunk(
  'suratJalan/fetchDetail',
  async (uuid: string, { rejectWithValue }) => {
    try {
      const sj = await suratJalanRepository.getByUuid(uuid)
      if (!sj) return rejectWithValue('SJ tidak ditemukan')
      return sj
    } catch {
      return rejectWithValue('Gagal memuat detail surat jalan')
    }
  }
)

export const assignSuratJalan = createAsyncThunk(
  'suratJalan/assign',
  async ({ uuid, input }: { uuid: string; input: AssignSJInput }, { rejectWithValue }) => {
    try {
      return await suratJalanRepository.assign(uuid, input)
    } catch {
      return rejectWithValue('Gagal assign surat jalan')
    }
  }
)

export const createSuratJalan = createAsyncThunk(
  'suratJalan/create',
  async (dto: CreateSJDto, { rejectWithValue }) => {
    try {
      return await suratJalanRepository.create(dto)
    } catch {
      return rejectWithValue('Gagal membuat surat jalan')
    }
  }
)

export const updateSuratJalan = createAsyncThunk(
  'suratJalan/update',
  async ({ uuid, dto }: { uuid: string; dto: UpdateSJDto }, { rejectWithValue }) => {
    try {
      return await suratJalanRepository.update(uuid, dto)
    } catch {
      return rejectWithValue('Gagal memperbarui surat jalan')
    }
  }
)

export const deliverSuratJalan = createAsyncThunk(
  'suratJalan/deliver',
  async ({ uuid, input }: { uuid: string; input: DeliverSJInput }, { rejectWithValue }) => {
    try {
      return await suratJalanRepository.deliver(uuid, input)
    } catch {
      return rejectWithValue('Gagal konfirmasi tiba')
    }
  }
)

export const voidSuratJalan = createAsyncThunk(
  'suratJalan/void',
  async ({ uuid, reason }: { uuid: string; reason: string }, { rejectWithValue }) => {
    try {
      return await suratJalanRepository.void(uuid, reason)
    } catch {
      return rejectWithValue('Gagal void surat jalan')
    }
  }
)

export const deleteSuratJalan = createAsyncThunk(
  'suratJalan/delete',
  async (uuid: string, { rejectWithValue }) => {
    try {
      await suratJalanRepository.delete(uuid)
      return uuid
    } catch {
      return rejectWithValue('Gagal hapus surat jalan')
    }
  }
)

function updateSJInList(list: SuratJalan[], updated: SuratJalan): SuratJalan[] {
  return list.map(sj => sj.uuid === updated.uuid ? updated : sj)
}

const suratJalanSlice = createSlice({
  name: 'suratJalan',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<SJFilterState>>) {
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
    openVoidModal(state, action: PayloadAction<string>) {
      state.isVoidModalOpen = true
      state.selectedUuid = action.payload
    },
    closeVoidModal(state) {
      state.isVoidModalOpen = false
      state.selectedUuid = null
    },
    openUploadPODModal(state, action: PayloadAction<string>) {
      state.isUploadPODModalOpen = true
      state.selectedUuid = action.payload
    },
    closeUploadPODModal(state) {
      state.isUploadPODModalOpen = false
      state.selectedUuid = null
    },
    openDetailDrawer(state, action: PayloadAction<string>) {
      state.isDetailDrawerOpen = true
      state.selectedUuid = action.payload
      state.selectedSJ = null
    },
    closeDetailDrawer(state) {
      state.isDetailDrawerOpen = false
      state.selectedUuid = null
      state.selectedSJ = null
    },
    openAssignModal(state, action: PayloadAction<string>) {
      state.isAssignModalOpen = true
      state.selectedUuid = action.payload
    },
    closeAssignModal(state) {
      state.isAssignModalOpen = false
      state.selectedUuid = null
    },
    openGeneratePDFModal(state, action: PayloadAction<string>) {
      state.isGeneratePDFModalOpen = true
      state.selectedUuid = action.payload
    },
    closeGeneratePDFModal(state) {
      state.isGeneratePDFModalOpen = false
      state.selectedUuid = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchSuratJalanList.pending, state => { state.isLoading = true; state.error = null })
      .addCase(fetchSuratJalanList.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.data
        state.pagination.total = action.payload.total
      })
      .addCase(fetchSuratJalanList.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchSuratJalanDetail.pending, state => { state.isDetailLoading = true })
      .addCase(fetchSuratJalanDetail.fulfilled, (state, action) => {
        state.isDetailLoading = false
        state.selectedSJ = action.payload
      })
      .addCase(fetchSuratJalanDetail.rejected, (state, action) => {
        state.isDetailLoading = false
        state.error = action.payload as string
      })
      .addCase(assignSuratJalan.fulfilled, (state, action) => {
        state.list = updateSJInList(state.list, action.payload)
        if (state.selectedSJ?.uuid === action.payload.uuid) state.selectedSJ = action.payload
        state.isAssignModalOpen = false
      })
      .addCase(createSuratJalan.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list]
        state.pagination.total += 1
      })
      .addCase(updateSuratJalan.fulfilled, (state, action) => {
        state.list = updateSJInList(state.list, action.payload)
        if (state.selectedSJ?.uuid === action.payload.uuid) state.selectedSJ = action.payload
      })
      .addCase(deliverSuratJalan.fulfilled, (state, action) => {
        state.list = updateSJInList(state.list, action.payload)
        if (state.selectedSJ?.uuid === action.payload.uuid) state.selectedSJ = action.payload
        state.isUploadPODModalOpen = false
      })
      .addCase(voidSuratJalan.fulfilled, (state, action) => {
        state.list = updateSJInList(state.list, action.payload)
        if (state.selectedSJ?.uuid === action.payload.uuid) state.selectedSJ = action.payload
        state.isVoidModalOpen = false
      })
      .addCase(deleteSuratJalan.fulfilled, (state, action) => {
        state.list = state.list.filter(sj => sj.uuid !== action.payload)
        state.pagination.total = Math.max(0, state.pagination.total - 1)
      })
  },
})

export const {
  setFilters, resetFilters, setPage, setPerPage,
  openVoidModal, closeVoidModal,
  openUploadPODModal, closeUploadPODModal,
  openDetailDrawer, closeDetailDrawer,
  openAssignModal, closeAssignModal,
  openGeneratePDFModal, closeGeneratePDFModal,
  clearError,
} = suratJalanSlice.actions

export default suratJalanSlice.reducer
