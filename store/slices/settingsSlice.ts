import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { SystemUser } from '@/features/settings/domain/entities/SystemUser'
import { NumberingSettings, CompanyProfile, BankAccount } from '@/features/settings/domain/entities/SystemSetting'
import { settingsRepository } from '@/features/settings/infrastructure/repositories/MockSettingsRepository'

interface SettingsState {
  users: SystemUser[]
  numbering: NumberingSettings | null
  company: CompanyProfile | null
  bankAccounts: BankAccount[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  modals: {
    userForm:      { open: boolean; data: SystemUser | null }
    resetPassword: { open: boolean; userUuid: string | null }
    bankForm:      { open: boolean; data: BankAccount | null }
  }
}

const initialState: SettingsState = {
  users: [],
  numbering: null,
  company: null,
  bankAccounts: [],
  isLoading: false,
  isSaving: false,
  error: null,
  modals: {
    userForm:      { open: false, data: null },
    resetPassword: { open: false, userUuid: null },
    bankForm:      { open: false, data: null },
  },
}

export const fetchUsers = createAsyncThunk('settings/fetchUsers', async () => settingsRepository.getUsers())
export const createUser = createAsyncThunk('settings/createUser', async (data: Parameters<typeof settingsRepository.createUser>[0], { rejectWithValue }) => {
  try { return await settingsRepository.createUser(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const updateUser = createAsyncThunk('settings/updateUser', async ({ uuid, data }: { uuid: string; data: Partial<SystemUser> }, { rejectWithValue }) => {
  try { return await settingsRepository.updateUser(uuid, data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const resetUserPassword = createAsyncThunk('settings/resetUserPassword', async ({ uuid, password }: { uuid: string; password: string }, { rejectWithValue }) => {
  try { await settingsRepository.resetPassword(uuid, password); return uuid }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const toggleUserStatus = createAsyncThunk('settings/toggleUserStatus', async (uuid: string, { rejectWithValue }) => {
  try { return await settingsRepository.toggleUserStatus(uuid) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const unlockUser = createAsyncThunk('settings/unlockUser', async (uuid: string, { rejectWithValue }) => {
  try { return await settingsRepository.unlockUser(uuid) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const fetchNumberingSettings = createAsyncThunk('settings/fetchNumbering', async () => settingsRepository.getNumberingSettings())
export const saveNumberingSettings = createAsyncThunk('settings/saveNumbering', async (data: Partial<NumberingSettings>, { rejectWithValue }) => {
  try { return await settingsRepository.updateNumberingSettings(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const fetchCompanyProfile = createAsyncThunk('settings/fetchCompany', async () => settingsRepository.getCompanyProfile())
export const saveCompanyProfile = createAsyncThunk('settings/saveCompany', async (data: Partial<CompanyProfile>, { rejectWithValue }) => {
  try { return await settingsRepository.updateCompanyProfile(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})

export const fetchBankAccounts = createAsyncThunk('settings/fetchBankAccounts', async () => settingsRepository.getBankAccounts())
export const createBankAccount = createAsyncThunk('settings/createBankAccount', async (data: Omit<BankAccount, 'id' | 'uuid'>, { rejectWithValue }) => {
  try { return await settingsRepository.createBankAccount(data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const updateBankAccount = createAsyncThunk('settings/updateBankAccount', async ({ uuid, data }: { uuid: string; data: Partial<Omit<BankAccount, 'id' | 'uuid'>> }, { rejectWithValue }) => {
  try { return await settingsRepository.updateBankAccount(uuid, data) }
  catch (e) { return rejectWithValue((e as Error).message) }
})
export const deleteBankAccount = createAsyncThunk('settings/deleteBankAccount', async (uuid: string, { rejectWithValue }) => {
  try { await settingsRepository.deleteBankAccount(uuid); return uuid }
  catch (e) { return rejectWithValue((e as Error).message) }
})

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    openUserForm(state, action: PayloadAction<SystemUser | null>) {
      state.modals.userForm = { open: true, data: action.payload }
    },
    closeUserForm(state) {
      state.modals.userForm = { open: false, data: null }
    },
    openResetPassword(state, action: PayloadAction<string>) {
      state.modals.resetPassword = { open: true, userUuid: action.payload }
    },
    closeResetPassword(state) {
      state.modals.resetPassword = { open: false, userUuid: null }
    },
    openBankForm(state, action: PayloadAction<BankAccount | null>) {
      state.modals.bankForm = { open: true, data: action.payload }
    },
    closeBankForm(state) {
      state.modals.bankForm = { open: false, data: null }
    },
    clearError(state) { state.error = null },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchUsers.pending, state => { state.isLoading = true })
      .addCase(fetchUsers.fulfilled, (state, a) => { state.isLoading = false; state.users = a.payload })
      .addCase(fetchUsers.rejected, (state, a) => { state.isLoading = false; state.error = a.payload as string })

      .addCase(createUser.pending, state => { state.isSaving = true })
      .addCase(createUser.fulfilled, (state, a) => { state.isSaving = false; state.users.push(a.payload); state.modals.userForm = { open: false, data: null } })
      .addCase(createUser.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })

      .addCase(updateUser.pending, state => { state.isSaving = true })
      .addCase(updateUser.fulfilled, (state, a) => {
        state.isSaving = false
        const idx = state.users.findIndex(u => u.uuid === a.payload.uuid)
        if (idx !== -1) state.users[idx] = a.payload
        state.modals.userForm = { open: false, data: null }
      })
      .addCase(updateUser.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })

      .addCase(resetUserPassword.pending, state => { state.isSaving = true })
      .addCase(resetUserPassword.fulfilled, state => { state.isSaving = false; state.modals.resetPassword = { open: false, userUuid: null } })
      .addCase(resetUserPassword.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })

      .addCase(toggleUserStatus.fulfilled, (state, a) => {
        const idx = state.users.findIndex(u => u.uuid === a.payload.uuid)
        if (idx !== -1) state.users[idx] = a.payload
      })

      .addCase(unlockUser.fulfilled, (state, a) => {
        const idx = state.users.findIndex(u => u.uuid === a.payload.uuid)
        if (idx !== -1) state.users[idx] = a.payload
      })

      .addCase(fetchNumberingSettings.fulfilled, (state, a) => { state.numbering = a.payload })
      .addCase(saveNumberingSettings.pending, state => { state.isSaving = true })
      .addCase(saveNumberingSettings.fulfilled, (state, a) => { state.isSaving = false; state.numbering = a.payload })
      .addCase(saveNumberingSettings.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })

      .addCase(fetchCompanyProfile.fulfilled, (state, a) => { state.company = a.payload })
      .addCase(saveCompanyProfile.pending, state => { state.isSaving = true })
      .addCase(saveCompanyProfile.fulfilled, (state, a) => { state.isSaving = false; state.company = a.payload })
      .addCase(saveCompanyProfile.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })

      .addCase(fetchBankAccounts.fulfilled, (state, a) => { state.bankAccounts = a.payload })
      .addCase(createBankAccount.pending, state => { state.isSaving = true })
      .addCase(createBankAccount.fulfilled, (state, a) => {
        state.isSaving = false
        state.bankAccounts.push(a.payload)
        state.modals.bankForm = { open: false, data: null }
      })
      .addCase(createBankAccount.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })
      .addCase(updateBankAccount.pending, state => { state.isSaving = true })
      .addCase(updateBankAccount.fulfilled, (state, a) => {
        state.isSaving = false
        const idx = state.bankAccounts.findIndex(b => b.uuid === a.payload.uuid)
        if (idx !== -1) state.bankAccounts[idx] = a.payload
        state.modals.bankForm = { open: false, data: null }
      })
      .addCase(updateBankAccount.rejected, (state, a) => { state.isSaving = false; state.error = a.payload as string })
      .addCase(deleteBankAccount.fulfilled, (state, a) => {
        state.bankAccounts = state.bankAccounts.filter(b => b.uuid !== a.payload)
      })
  },
})

export const { openUserForm, closeUserForm, openResetPassword, closeResetPassword, openBankForm, closeBankForm, clearError } = settingsSlice.actions
export default settingsSlice.reducer
