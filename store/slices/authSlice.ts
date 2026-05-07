import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id?: number | string
  uuid?: string
  name: string
  email: string
  role: 'super_admin' | 'admin_ops' | 'admin_finance'
  is_active?: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loginAttempts: number
  accessToken: string | null
  refreshToken: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loginAttempts: 0,
  accessToken: null,
  refreshToken: null,
}

interface LoginSuccessPayload {
  user: User
  accessToken?: string
  refreshToken?: string
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<User | LoginSuccessPayload>) {
      const payload = action.payload
      const user = 'user' in payload ? payload.user : payload
      state.user = user
      state.isAuthenticated = true
      state.loginAttempts = 0
      state.accessToken = 'accessToken' in payload ? payload.accessToken ?? null : null
      state.refreshToken = 'refreshToken' in payload ? payload.refreshToken ?? null : null
    },
    loginFailed(state) {
      state.loginAttempts += 1
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
      state.loginAttempts = 0
      state.accessToken = null
      state.refreshToken = null
    },
    resetAttempts(state) {
      state.loginAttempts = 0
    },
  },
})

export const { loginSuccess, loginFailed, logout, resetAttempts } = authSlice.actions
export default authSlice.reducer
