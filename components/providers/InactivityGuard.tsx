'use client'

import { useEffect } from 'react'
import { startInactivityTracker } from '@/lib/inactivityTracker'
import { getStoredAuthSession } from '@/lib/apiClient'

export default function InactivityGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hanya aktifkan tracker jika user sudah login
    if (!getStoredAuthSession()) return
    return startInactivityTracker()
  }, [])

  return <>{children}</>
}
