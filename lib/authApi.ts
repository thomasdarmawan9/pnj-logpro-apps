import { apiRequest, getRefreshToken } from './apiClient'

export type AuthRole = 'super_admin' | 'admin_ops' | 'admin_finance'

export interface AuthUser {
  id?: number | string
  uuid?: string
  name: string
  email: string
  role: AuthRole
  is_active?: boolean
}

export interface LoginResult {
  user: AuthUser
  access_token: string
  refresh_token: string
}

export async function login(email: string, password: string) {
  const response = await apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  return response.data
}

export async function logoutSession() {
  const refreshToken = getRefreshToken()
  await apiRequest<null>('/auth/logout', {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : {},
  })
}
