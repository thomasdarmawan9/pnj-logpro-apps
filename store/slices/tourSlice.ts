import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface TourState {
  isRunning: boolean
  stepIndex: number
  pendingRoute: string | null
  pendingStepIndex: number | null
}

const initialState: TourState = {
  isRunning: false,
  stepIndex: 0,
  pendingRoute: null,
  pendingStepIndex: null,
}

const tourSlice = createSlice({
  name: 'tour',
  initialState,
  reducers: {
    startTour(state) {
      state.isRunning = true
      state.stepIndex = 0
      state.pendingRoute = null
      state.pendingStepIndex = null
    },
    stopTour(state) {
      state.isRunning = false
      state.stepIndex = 0
      state.pendingRoute = null
      state.pendingStepIndex = null
    },
    setStepIndex(state, action: PayloadAction<number>) {
      state.stepIndex = action.payload
    },
    navigateTo(state, action: PayloadAction<{ route: string; stepIndex: number }>) {
      state.pendingRoute = action.payload.route
      state.pendingStepIndex = action.payload.stepIndex
    },
    clearPendingRoute(state) {
      state.pendingRoute = null
      state.pendingStepIndex = null
    },
  },
})

export const { startTour, stopTour, setStepIndex, navigateTo, clearPendingRoute } = tourSlice.actions
export default tourSlice.reducer
