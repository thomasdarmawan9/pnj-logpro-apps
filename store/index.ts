import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import suratJalanReducer from './slices/suratJalanSlice'
import invoiceReducer from './slices/invoiceSlice'
import stockReducer from './slices/stockSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    suratJalan: suratJalanReducer,
    invoice: invoiceReducer,
    stock: stockReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
