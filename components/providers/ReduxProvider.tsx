'use client'

import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { useDispatch } from 'react-redux'
import { store } from '@/store'
import { loginSuccess } from '@/store/slices/authSlice'
import { ToastProvider } from '@/components/toast/useToast'
import ToastContainer from '@/components/toast/ToastContainer'
import { AuthUser } from '@/lib/authApi'
import { getStoredAuthSession } from '@/lib/apiClient'

function AuthHydrator() {
  const dispatch = useDispatch()

  useEffect(() => {
    const session = getStoredAuthSession<AuthUser>()
    if (!session) return

    dispatch(loginSuccess({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }))
  }, [dispatch])

  return null
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthHydrator />
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </Provider>
  )
}
