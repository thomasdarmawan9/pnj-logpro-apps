'use client'

import { Provider } from 'react-redux'
import { store } from '@/store'
import { ToastProvider } from '@/components/toast/useToast'
import ToastContainer from '@/components/toast/ToastContainer'

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </Provider>
  )
}
