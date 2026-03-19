import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { AgingARSummary } from '@/features/reports/domain/entities/AgingARReport'
import { ProfitLossSummary } from '@/features/reports/domain/entities/ProfitLossReport'
import { AuditLog } from '@/features/reports/domain/entities/AuditLog'
import { AgingBucket } from '@/features/reports/domain/value-objects/AgingBucket'
import { PeriodPreset, ProfitabilityFilter } from '@/features/reports/application/dto/ProfitLossFilterDto'
import { reportsRepository } from '@/features/reports/infrastructure/repositories/MockReportsRepository'

// ─── Filter State Types ────────────────────────────────────────────────────────

export interface AgingARFilterState {
  customerId: number | 'all'
  bucket: AgingBucket | 'all'
  search: string
}

export interface ProfitLossFilterState {
  periodPreset: PeriodPreset
  periodFrom: string
  periodTo: string
  customerId: number | 'all'
  projectStatus: string
  profitability: ProfitabilityFilter
}

export interface AuditTrailFilterState {
  search: string
  module: string
  action: string
  periodPreset: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

// ─── Slice State ──────────────────────────────────────────────────────────────

interface ReportsState {
  agingAR: {
    data: AgingARSummary | null
    filters: AgingARFilterState
    isLoading: boolean
    lastRefreshed: string | null
  }
  profitLoss: {
    data: ProfitLossSummary | null
    filters: ProfitLossFilterState
    isLoading: boolean
    lastRefreshed: string | null
  }
  auditTrail: {
    logs: AuditLog[]
    filters: AuditTrailFilterState
    pagination: PaginationState
    isLoading: boolean
  }
  isExporting: boolean
}

const sixMonthsAgo = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString().split('T')[0]
})()

const today = new Date().toISOString().split('T')[0]

const initialState: ReportsState = {
  agingAR: {
    data: null,
    filters: { customerId: 'all', bucket: 'all', search: '' },
    isLoading: false,
    lastRefreshed: null,
  },
  profitLoss: {
    data: null,
    filters: {
      periodPreset: '6_months',
      periodFrom: sixMonthsAgo,
      periodTo: today,
      customerId: 'all',
      projectStatus: 'all',
      profitability: 'all',
    },
    isLoading: false,
    lastRefreshed: null,
  },
  auditTrail: {
    logs: [],
    filters: { search: '', module: 'all', action: 'all', periodPreset: 'today' },
    pagination: { page: 1, perPage: 25, total: 0 },
    isLoading: false,
  },
  isExporting: false,
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAgingAR = createAsyncThunk(
  'reports/fetchAgingAR',
  async (_, { getState }) => {
    const state = (getState() as { reports: ReportsState }).reports
    const filters = state.agingAR.filters
    return await reportsRepository.getAgingAR(filters)
  }
)

export const fetchProfitLoss = createAsyncThunk(
  'reports/fetchProfitLoss',
  async (_, { getState }) => {
    const state = (getState() as { reports: ReportsState }).reports
    const filters = state.profitLoss.filters
    return await reportsRepository.getProfitLoss(filters)
  }
)

export const fetchAuditTrail = createAsyncThunk(
  'reports/fetchAuditTrail',
  async (_, { getState }) => {
    const state = (getState() as { reports: ReportsState }).reports
    const { filters, pagination } = state.auditTrail
    return await reportsRepository.getAuditTrail({
      ...filters,
      page: pagination.page,
      perPage: pagination.perPage,
    })
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setAgingARFilters(state, action: PayloadAction<Partial<AgingARFilterState>>) {
      state.agingAR.filters = { ...state.agingAR.filters, ...action.payload }
    },
    setProfitLossFilters(state, action: PayloadAction<Partial<ProfitLossFilterState>>) {
      state.profitLoss.filters = { ...state.profitLoss.filters, ...action.payload }
    },
    setAuditTrailFilters(state, action: PayloadAction<Partial<AuditTrailFilterState>>) {
      state.auditTrail.filters = { ...state.auditTrail.filters, ...action.payload }
      state.auditTrail.pagination.page = 1
    },
    setAuditTrailPage(state, action: PayloadAction<number>) {
      state.auditTrail.pagination.page = action.payload
    },
    setExporting(state, action: PayloadAction<boolean>) {
      state.isExporting = action.payload
    },
  },
  extraReducers: builder => {
    // Aging AR
    builder
      .addCase(fetchAgingAR.pending, state => { state.agingAR.isLoading = true })
      .addCase(fetchAgingAR.fulfilled, (state, action) => {
        state.agingAR.isLoading = false
        state.agingAR.data = action.payload
        state.agingAR.lastRefreshed = new Date().toISOString()
      })
      .addCase(fetchAgingAR.rejected, state => { state.agingAR.isLoading = false })

    // Profit Loss
    builder
      .addCase(fetchProfitLoss.pending, state => { state.profitLoss.isLoading = true })
      .addCase(fetchProfitLoss.fulfilled, (state, action) => {
        state.profitLoss.isLoading = false
        state.profitLoss.data = action.payload
        state.profitLoss.lastRefreshed = new Date().toISOString()
      })
      .addCase(fetchProfitLoss.rejected, state => { state.profitLoss.isLoading = false })

    // Audit Trail
    builder
      .addCase(fetchAuditTrail.pending, state => { state.auditTrail.isLoading = true })
      .addCase(fetchAuditTrail.fulfilled, (state, action) => {
        state.auditTrail.isLoading = false
        state.auditTrail.logs = action.payload.logs
        state.auditTrail.pagination.total = action.payload.total
      })
      .addCase(fetchAuditTrail.rejected, state => { state.auditTrail.isLoading = false })
  },
})

export const {
  setAgingARFilters,
  setProfitLossFilters,
  setAuditTrailFilters,
  setAuditTrailPage,
  setExporting,
} = reportsSlice.actions

export default reportsSlice.reducer
