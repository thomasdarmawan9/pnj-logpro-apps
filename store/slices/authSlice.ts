import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  name: string
  email: string
  role: 'super_admin' | 'admin_ops' | 'admin_finance'
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loginAttempts: number
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loginAttempts: 0,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<User>) {
      state.user = action.payload
      state.isAuthenticated = true
      state.loginAttempts = 0
    },
    loginFailed(state) {
      state.loginAttempts += 1
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
      state.loginAttempts = 0
    },
    resetAttempts(state) {
      state.loginAttempts = 0
    },
  },
})

export const { loginSuccess, loginFailed, logout, resetAttempts } = authSlice.actions
export default authSlice.reducer
