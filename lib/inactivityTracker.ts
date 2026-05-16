import { clearAuthSession } from './apiClient'

const INACTIVITY_MS   = 60 * 60 * 1000  // 1 jam tanpa aktivitas → logout
const CHECK_EVERY_MS  = 60 * 1000        // cek setiap 1 menit
const THROTTLE_MS     = 1_000            // update timestamp max 1x/detik
const LAST_ACTIVE_KEY = 'pnj_last_activity'

function touchActivity() {
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
}

function getLastActivity(): number {
  const val = localStorage.getItem(LAST_ACTIVE_KEY)
  return val ? parseInt(val, 10) : Date.now()
}

function forceLogout() {
  clearAuthSession()
  document.cookie = 'pnj_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  window.location.href = '/login'
}

/**
 * Mulai inactivity tracker. Dipanggil sekali saat app mount (client-side).
 * Return cleanup function untuk dipakai di useEffect.
 */
export function startInactivityTracker(): () => void {
  if (typeof window === 'undefined') return () => {}

  touchActivity()

  let lastThrottle = 0
  const handleActivity = () => {
    const now = Date.now()
    if (now - lastThrottle > THROTTLE_MS) {
      lastThrottle = now
      touchActivity()
    }
  }

  const EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const
  EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

  const intervalId = setInterval(() => {
    if (Date.now() - getLastActivity() > INACTIVITY_MS) {
      forceLogout()
    }
  }, CHECK_EVERY_MS)

  return () => {
    EVENTS.forEach(e => window.removeEventListener(e, handleActivity))
    clearInterval(intervalId)
  }
}
