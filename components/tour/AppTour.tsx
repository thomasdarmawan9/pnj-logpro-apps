'use client'

import { useEffect } from 'react'
import { Joyride, EventData, Controls, ACTIONS, EVENTS, STATUS, PORTAL_ELEMENT_ID } from 'react-joyride'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import { RootState } from '@/store'
import { stopTour, setStepIndex, navigateTo, clearPendingRoute } from '@/store/slices/tourSlice'
import { TOUR_STEPS } from './tourSteps'

function forceKillOverlay() {
  // Remove Joyride's portal container that is appended directly to document.body.
  // React's unmount only clears the React tree inside the portal; the container
  // div itself is created via vanilla JS and must be removed manually.
  document.getElementById(PORTAL_ELEMENT_ID)?.remove()
  // Belt-and-suspenders: also remove any leftover fixed overlay divs Joyride injects
  document.querySelectorAll('[data-joyride-portal]').forEach(el => el.remove())
}

export default function AppTour() {
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const { isRunning, stepIndex, pendingRoute, pendingStepIndex } = useSelector(
    (s: RootState) => s.tour
  )

  // After navigation completes, resume the tour at the pending step index.
  // State lives in Redux so it survives AppTour re-mount across page changes.
  useEffect(() => {
    if (pendingRoute && pathname === pendingRoute && pendingStepIndex !== null) {
      dispatch(clearPendingRoute())
      const timer = setTimeout(() => {
        dispatch(setStepIndex(pendingStepIndex))
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, pendingRoute, pendingStepIndex, dispatch])

  // Clean up the portal whenever this component unmounts (page change or stop)
  useEffect(() => {
    return () => { forceKillOverlay() }
  }, [])

  const handleEvent = (data: EventData, _controls: Controls) => {
    const { action, index, type, status } = data

    const markDone = () => {
      window.localStorage.setItem('pnj_tour_done', '1')
    }

    // Guard: status-level finish/skip (fires in non-controlled or after STEP_AFTER in some versions)
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markDone()
      forceKillOverlay()
      dispatch(stopTour())
      return
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Skip button pressed — controlled mode may not emit STATUS.SKIPPED separately
      if (action === ACTIONS.SKIP) {
        markDone()
        forceKillOverlay()
        dispatch(stopTour())
        return
      }

      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1)

      // Last step completed — controlled mode may not emit STATUS.FINISHED
      if (nextIndex >= TOUR_STEPS.length) {
        markDone()
        forceKillOverlay()
        dispatch(stopTour())
        return
      }

      if (nextIndex < 0) return

      const nextStep = TOUR_STEPS[nextIndex]
      const targetRoute = nextStep.route

      if (targetRoute && targetRoute !== pathname) {
        dispatch(navigateTo({ route: targetRoute, stepIndex: nextIndex }))
        router.push(targetRoute)
      } else {
        dispatch(setStepIndex(nextIndex))
      }
    }
  }

  if (!isRunning) return null

  return (
    <Joyride
      steps={TOUR_STEPS}
      stepIndex={stepIndex}
      run={!pendingRoute}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: '#3A8C4A',
        backgroundColor: '#ffffff',
        textColor: '#1A1A1A',
        overlayColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 10000,
        showProgress: true,
        buttons: ['back', 'skip', 'primary'],
        overlayClickAction: false,
        spotlightRadius: 12,
        spotlightPadding: 6,
        width: 340,
        skipBeacon: true,
        targetWaitTimeout: 2000,
      }}
      locale={{
        back: '← Kembali',
        close: 'Tutup',
        last: 'Selesai',
        next: 'Lanjut →',
        skip: 'Lewati Tour',
        nextWithProgress: 'Lanjut →',
      }}
      styles={{
        tooltip: {
          borderRadius: 16,
          padding: '20px 24px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        },
        tooltipTitle: {
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 8,
          color: '#1A1A1A',
        },
        tooltipContent: {
          fontSize: 13,
          lineHeight: 1.6,
          color: '#4B5563',
          padding: 0,
        },
        tooltipFooter: {
          marginTop: 16,
          gap: 8,
        },
        buttonPrimary: {
          backgroundColor: '#3A8C4A',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6B7280',
          fontSize: 13,
          fontWeight: 500,
          marginRight: 'auto',
        },
        buttonSkip: {
          color: '#9CA3AF',
          fontSize: 12,
        },
      }}
    />
  )
}
