export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1'

const ACCESS_TOKEN_KEY = 'pnj_access_token'
const REFRESH_TOKEN_KEY = 'pnj_refresh_token'
const USER_KEY = 'pnj_user'

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: unknown
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getAccessToken() {
  if (!isBrowser()) return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function storeAuthSession(accessToken: string, refreshToken: string, user: unknown) {
  if (!isBrowser()) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredAuthSession<TUser>() {
  if (!isBrowser()) return null

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY)
  const userText = window.localStorage.getItem(USER_KEY)

  if (!accessToken || !refreshToken || !userText) return null

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(userText) as TUser,
    }
  } catch {
    clearAuthSession()
    return null
  }
}

export function clearAuthSession() {
  if (!isBrowser()) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers)
  const token = getAccessToken()

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body
    } else {
      headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
      body = JSON.stringify(options.body)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  })

  if (response.status === 401 && isBrowser()) {
    clearAuthSession()
    document.cookie = 'pnj_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    window.location.href = '/login'
    throw new ApiError('Sesi berakhir. Silakan login kembali.', 401)
  }

  const text = await response.text()
  let payload: { success?: boolean; message?: string; data?: unknown } | null = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError('Respons server tidak valid (bukan JSON).', response.status)
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.message || 'Terjadi kesalahan pada server.', response.status)
  }

  return payload as ApiEnvelope<T>
}

export async function apiDownload(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  const token = getAccessToken()

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new ApiError('Gagal mengunduh file.', response.status)
  }

  return response.blob()
}
