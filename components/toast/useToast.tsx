'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
  clear: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const clear = useCallback(() => setToasts([]), [])

  const value = useMemo(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus digunakan di dalam ToastProvider')
  return ctx
}
