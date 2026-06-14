export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1'

const ACCESS_TOKEN_KEY = 'pnj_access_token'
const REFRESH_TOKEN_KEY = 'pnj_refresh_token'
const USER_KEY = 'pnj_user'

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
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

function readAuthStorage() {
  if (!isBrowser()) return null
  if (window.localStorage.getItem(ACCESS_TOKEN_KEY)) {
    return { storage: window.localStorage, remember: true }
  }
  if (window.sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
    return { storage: window.sessionStorage, remember: false }
  }
  return null
}

export function getAccessToken() {
  if (!isBrowser()) return null
  return readAuthStorage()?.storage.getItem(ACCESS_TOKEN_KEY) ?? null
}

export function getRefreshToken() {
  if (!isBrowser()) return null
  return readAuthStorage()?.storage.getItem(REFRESH_TOKEN_KEY) ?? null
}

export function isRememberedAuthSession() {
  return readAuthStorage()?.remember === true
}

export function storeAuthSession(accessToken: string, refreshToken: string, user: unknown, remember?: boolean) {
  if (!isBrowser()) return
  const shouldRemember = remember ?? readAuthStorage()?.remember ?? true
  const target = shouldRemember ? window.localStorage : window.sessionStorage
  const other = shouldRemember ? window.sessionStorage : window.localStorage

  other.removeItem(ACCESS_TOKEN_KEY)
  other.removeItem(REFRESH_TOKEN_KEY)
  other.removeItem(USER_KEY)

  target.setItem(ACCESS_TOKEN_KEY, accessToken)
  target.setItem(REFRESH_TOKEN_KEY, refreshToken)
  target.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredAuthSession<TUser>() {
  if (!isBrowser()) return null

  const authStorage = readAuthStorage()
  if (!authStorage) return null

  const accessToken = authStorage.storage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = authStorage.storage.getItem(REFRESH_TOKEN_KEY)
  const userText = authStorage.storage.getItem(USER_KEY)

  if (!accessToken || !refreshToken || !userText) return null

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(userText) as TUser,
      remember: authStorage.remember,
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
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  window.sessionStorage.removeItem(USER_KEY)
}

function forceLogout() {
  clearAuthSession()
  document.cookie = 'pnj_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  window.location.href = '/login'
}

// Singleton promise untuk prevent concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const session = getStoredAuthSession<unknown>()
      if (!session?.refreshToken) return null

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: session.refreshToken }),
      })
      if (!res.ok) return null

      const data = await res.json()
      const newAccess  = data?.data?.access_token
      const newRefresh = data?.data?.refresh_token
      if (!newAccess) return null

      storeAuthSession(newAccess, newRefresh ?? session.refreshToken, session.user, session.remember)
      return newAccess as string
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
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
    const newToken = await tryRefreshToken()
    if (newToken) {
      // Retry request dengan token baru
      headers.set('Authorization', `Bearer ${newToken}`)
      const retry = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, body })
      if (retry.ok) {
        const retryText = await retry.text()
        return (retryText ? JSON.parse(retryText) : null) as ApiEnvelope<T>
      }
    }
    forceLogout()
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

export async function apiRequestAllPages<T>(path: string, options: ApiRequestOptions = {}): Promise<T[]> {
  const pageSize = 100
  const joiner = path.includes('?') ? '&' : '?'
  const first = await apiRequest<T[]>(`${path}${joiner}page=1&limit=${pageSize}`, options)
  const rows = [...first.data]
  const totalPages = Number(first.meta?.totalPages || 1)

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await apiRequest<T[]>(`${path}${joiner}page=${page}&limit=${pageSize}`, options)
    rows.push(...next.data)
  }

  return rows
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

  if (response.status === 401 && isBrowser()) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      const retry = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
      if (retry.ok) return retry.blob()
    }
    forceLogout()
    throw new ApiError('Sesi berakhir. Silakan login kembali.', 401)
  }

  if (!response.ok) {
    throw new ApiError('Gagal mengunduh file.', response.status)
  }

  return response.blob()
}
