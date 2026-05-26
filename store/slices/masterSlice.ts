import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Customer } from '@/features/master/domain/entities/Customer'
import { Fleet } from '@/features/master/domain/entities/Fleet'
import { Driver } from '@/features/master/domain/entities/Driver'
import { Project } from '@/features/master/domain/entities/Project'
import { masterRepository } from '@/features/master/infrastructure/repositories/MockMasterRepository'

interface MasterState {
  customers: Customer[]
  fleets: Fleet[]
  drivers: Driver[]
  projects: Project[]
  selectedProject: Project | null
  isLoading: boolean
  error: string | null
  modals: {
    customerForm: { open: boolean; data: Customer | null }
    fleetForm:    { open: boolean; data: Fleet | null }
    driverForm:   { open: boolean; data: Driver | null }
    projectForm:  { open: boolean; data: Project | null }
  }
}

const initialState: MasterState = {
  customers: [],
  fleets: [],
  drivers: [],
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,
  modals: {
    customerForm: { open: false, data: null },
    fleetForm:    { open: false, data: null },
    driverForm:   { open: false, data: null },
    projectForm:  { open: false, data: null },
  },
}

// Thunks — Customer
export const fetchCustomers = createAsyncThunk('master/fetchCustomers', async () => masterRepository.getCustomers())
export const createCustomer = createAsyncThunk('master/createCustomer', async (data: Parameters<typeof masterRepository.createCustomer>[0], { rejectWithValue }) => {
  try { return await masterRepository.createCustomer(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const updateCustomer = createAsyncThunk('master/updateCustomer', async ({ uuid, data }: { uuid: string; data: Partial<Customer> }, { rejectWithValue }) => {
  try { return await masterRepository.updateCustomer(uuid, data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const deleteCustomer = createAsyncThunk('master/deleteCustomer', async (uuid: string, { rejectWithValue }) => {
  try { await masterRepository.deleteCustomer(uuid); return uuid }
  catch (e) { return rejectWithValue((e as Error).message) }
})

// Thunks — Fleet
export const fetchFleets = createAsyncThunk('master/fetchFleets', async () => masterRepository.getFleets())
export const createFleet = createAsyncThunk('master/createFleet', async (data: Parameters<typeof masterRepository.createFleet>[0], { rejectWithValue }) => {
  try { return await masterRepository.createFleet(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const updateFleet = createAsyncThunk('master/updateFleet', async ({ uuid, data }: { uuid: string; data: Partial<Fleet> }, { rejectWithValue }) => {
  try { return await masterRepository.updateFleet(uuid, data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const toggleFleetStatus = createAsyncThunk('master/toggleFleetStatus', async (uuid: string, { rejectWithValue }) => {
  try { return await masterRepository.toggleFleetStatus(uuid) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const completeFleetRental = createAsyncThunk('master/completeFleetRental', async (uuid: string, { rejectWithValue }) => {
  try { return await masterRepository.completeFleetRental(uuid) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const uploadFleetLampiran = createAsyncThunk('master/uploadFleetLampiran', async ({ uuid, file }: { uuid: string; file: File }, { rejectWithValue }) => {
  try { return await masterRepository.uploadFleetLampiran(uuid, file) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const deleteFleetLampiran = createAsyncThunk('master/deleteFleetLampiran', async ({ uuid, filePath }: { uuid: string; filePath: string }, { rejectWithValue }) => {
  try { return await masterRepository.deleteFleetLampiran(uuid, filePath) }
  catch (e) { return rejectWithValue((e as Error).message) }
})

// Thunks — Driver
export const fetchDrivers = createAsyncThunk('master/fetchDrivers', async () => masterRepository.getDrivers())
export const createDriver = createAsyncThunk('master/createDriver', async (data: Parameters<typeof masterRepository.createDriver>[0], { rejectWithValue }) => {
  try { return await masterRepository.createDriver(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const updateDriver = createAsyncThunk('master/updateDriver', async ({ uuid, data }: { uuid: string; data: Partial<Driver> }, { rejectWithValue }) => {
  try { return await masterRepository.updateDriver(uuid, data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const toggleDriverStatus = createAsyncThunk('master/toggleDriverStatus', async (uuid: string, { rejectWithValue }) => {
  try { return await masterRepository.toggleDriverStatus(uuid) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const uploadDriverLampiran = createAsyncThunk('master/uploadDriverLampiran', async ({ uuid, file }: { uuid: string; file: File }, { rejectWithValue }) => {
  try { return await masterRepository.uploadDriverLampiran(uuid, file) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const deleteDriverLampiran = createAsyncThunk('master/deleteDriverLampiran', async ({ uuid, filePath }: { uuid: string; filePath: string }, { rejectWithValue }) => {
  try { return await masterRepository.deleteDriverLampiran(uuid, filePath) }
  catch (e) { return rejectWithValue((e as Error).message) }
})

// Thunks — Project
export const fetchProjects = createAsyncThunk('master/fetchProjects', async () => masterRepository.getProjects())
export const fetchProjectDetail = createAsyncThunk('master/fetchProjectDetail', async (uuid: string) => masterRepository.getProjectDetail(uuid))
export const createProject = createAsyncThunk('master/createProject', async (data: Parameters<typeof masterRepository.createProject>[0], { rejectWithValue }) => {
  try { return await masterRepository.createProject(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const updateProject = createAsyncThunk('master/updateProject', async ({ uuid, data }: { uuid: string; data: Partial<Project> }, { rejectWithValue }) => {
  try { return await masterRepository.updateProject(uuid, data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})

const masterSlice = createSlice({
  name: 'master',
  initialState,
  reducers: {
    openCustomerForm(state, action: PayloadAction<Customer | null>) {
      state.modals.customerForm = { open: true, data: action.payload }
    },
    closeCustomerForm(state) {
      state.modals.customerForm = { open: false, data: null }
    },
    openFleetForm(state, action: PayloadAction<Fleet | null>) {
      state.modals.fleetForm = { open: true, data: action.payload }
    },
    closeFleetForm(state) {
      state.modals.fleetForm = { open: false, data: null }
    },
    openDriverForm(state, action: PayloadAction<Driver | null>) {
      state.modals.driverForm = { open: true, data: action.payload }
    },
    closeDriverForm(state) {
      state.modals.driverForm = { open: false, data: null }
    },
    openProjectForm(state, action: PayloadAction<Project | null>) {
      state.modals.projectForm = { open: true, data: action.payload }
    },
    closeProjectForm(state) {
      state.modals.projectForm = { open: false, data: null }
    },
    clearError(state) { state.error = null },
    clearSelectedProject(state) { state.selectedProject = null },
  },
  extraReducers: builder => {
    // Helper to handle loading/error — typed loosely to avoid Immer Draft conflicts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pending = (state: any) => { state.isLoading = true; state.error = null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rejected = (state: any, action: { payload?: unknown }) => { state.isLoading = false; state.error = (action.payload as string) || 'Terjadi kesalahan' }
    const replaceFleet = (state: MasterState, payload: Fleet) => {
      const idx = state.fleets.findIndex(f => f.uuid === payload.uuid)
      if (idx === -1) return

      const current = state.fleets[idx]
      state.fleets[idx] = {
        ...payload,
        total_trips: current.total_trips,
        active_days_this_month: current.active_days_this_month,
        last_used_date: current.last_used_date,
      }
      if (state.modals.fleetForm.data?.uuid === payload.uuid) {
        state.modals.fleetForm.data = state.fleets[idx]
      }
    }

    builder
      .addCase(fetchCustomers.pending, pending)
      .addCase(fetchCustomers.fulfilled, (state, a) => { state.isLoading = false; state.customers = a.payload })
      .addCase(fetchCustomers.rejected, rejected)

      .addCase(createCustomer.pending, pending)
      .addCase(createCustomer.fulfilled, (state, a) => { state.isLoading = false; state.customers.push(a.payload); state.modals.customerForm = { open: false, data: null } })
      .addCase(createCustomer.rejected, rejected)

      .addCase(updateCustomer.pending, pending)
      .addCase(updateCustomer.fulfilled, (state, a) => {
        state.isLoading = false
        const idx = state.customers.findIndex(c => c.uuid === a.payload.uuid)
        if (idx !== -1) state.customers[idx] = a.payload
        state.modals.customerForm = { open: false, data: null }
      })
      .addCase(updateCustomer.rejected, rejected)

      .addCase(deleteCustomer.pending, pending)
      .addCase(deleteCustomer.fulfilled, (state, a) => { state.isLoading = false; state.customers = state.customers.filter(c => c.uuid !== a.payload) })
      .addCase(deleteCustomer.rejected, rejected)

      .addCase(fetchFleets.pending, pending)
      .addCase(fetchFleets.fulfilled, (state, a) => { state.isLoading = false; state.fleets = a.payload })
      .addCase(fetchFleets.rejected, rejected)

      .addCase(createFleet.pending, pending)
      .addCase(createFleet.fulfilled, (state, a) => { state.isLoading = false; state.fleets.push(a.payload) })
      .addCase(createFleet.rejected, rejected)

      .addCase(updateFleet.pending, pending)
      .addCase(updateFleet.fulfilled, (state, a) => {
        state.isLoading = false
        replaceFleet(state, a.payload)
      })
      .addCase(updateFleet.rejected, rejected)

      .addCase(toggleFleetStatus.fulfilled, (state, a) => {
        replaceFleet(state, a.payload)
      })
      .addCase(completeFleetRental.fulfilled, (state, a) => {
        replaceFleet(state, a.payload)
      })
      .addCase(uploadFleetLampiran.fulfilled, (state, a) => {
        replaceFleet(state, a.payload)
      })
      .addCase(deleteFleetLampiran.fulfilled, (state, a) => {
        replaceFleet(state, a.payload)
      })

      .addCase(fetchDrivers.pending, pending)
      .addCase(fetchDrivers.fulfilled, (state, a) => { state.isLoading = false; state.drivers = a.payload })
      .addCase(fetchDrivers.rejected, rejected)

      .addCase(createDriver.pending, pending)
      .addCase(createDriver.fulfilled, (state, a) => { state.isLoading = false; state.drivers.push(a.payload) })
      .addCase(createDriver.rejected, rejected)

      .addCase(updateDriver.pending, pending)
      .addCase(updateDriver.fulfilled, (state, a) => {
        state.isLoading = false
        const idx = state.drivers.findIndex(d => d.uuid === a.payload.uuid)
        if (idx !== -1) state.drivers[idx] = a.payload
      })
      .addCase(updateDriver.rejected, rejected)

      .addCase(toggleDriverStatus.fulfilled, (state, a) => {
        const idx = state.drivers.findIndex(d => d.uuid === a.payload.uuid)
        if (idx !== -1) state.drivers[idx] = a.payload
      })
      .addCase(uploadDriverLampiran.fulfilled, (state, a) => {
        const idx = state.drivers.findIndex(d => d.uuid === a.payload.uuid)
        if (idx !== -1) state.drivers[idx] = a.payload
      })
      .addCase(deleteDriverLampiran.fulfilled, (state, a) => {
        const idx = state.drivers.findIndex(d => d.uuid === a.payload.uuid)
        if (idx !== -1) state.drivers[idx] = a.payload
      })

      .addCase(fetchProjects.pending, pending)
      .addCase(fetchProjects.fulfilled, (state, a) => { state.isLoading = false; state.projects = a.payload })
      .addCase(fetchProjects.rejected, rejected)

      .addCase(fetchProjectDetail.fulfilled, (state, a) => { state.selectedProject = a.payload })

      .addCase(createProject.pending, pending)
      .addCase(createProject.fulfilled, (state, a) => { state.isLoading = false; state.projects.push(a.payload); state.modals.projectForm = { open: false, data: null } })
      .addCase(createProject.rejected, rejected)

      .addCase(updateProject.pending, pending)
      .addCase(updateProject.fulfilled, (state, a) => {
        state.isLoading = false
        const idx = state.projects.findIndex(p => p.uuid === a.payload.uuid)
        if (idx !== -1) state.projects[idx] = a.payload
        if (state.selectedProject?.uuid === a.payload.uuid) state.selectedProject = a.payload
        state.modals.projectForm = { open: false, data: null }
      })
      .addCase(updateProject.rejected, rejected)
  },
})

export const {
  openCustomerForm, closeCustomerForm,
  openFleetForm, closeFleetForm,
  openDriverForm, closeDriverForm,
  openProjectForm, closeProjectForm,
  clearError, clearSelectedProject,
} = masterSlice.actions

export default masterSlice.reducer
