import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import suratJalanReducer from './slices/suratJalanSlice'
import invoiceReducer from './slices/invoiceSlice'
import stockReducer from './slices/stockSlice'
import reportsReducer from './slices/reportsSlice'
import masterReducer from './slices/masterSlice'
import settingsReducer from './slices/settingsSlice'
import tourReducer from './slices/tourSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    suratJalan: suratJalanReducer,
    invoice: invoiceReducer,
    stock: stockReducer,
    reports: reportsReducer,
    master: masterReducer,
    settings: settingsReducer,
    tour: tourReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
