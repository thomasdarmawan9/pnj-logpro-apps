'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import {
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
  openCustomerForm, closeCustomerForm,
} from '@/store/slices/masterSlice'
import { Customer } from '@/features/master/domain/entities/Customer'

export function useCustomer() {
  const dispatch = useDispatch<AppDispatch>()
  const { customers, isLoading, error, modals } = useSelector((s: RootState) => s.master)

  useEffect(() => {
    if (customers.length === 0) dispatch(fetchCustomers())
  }, [dispatch, customers.length])

  return {
    customers,
    isLoading,
    error,
    modal: modals.customerForm,
    openForm: (data: Customer | null = null) => dispatch(openCustomerForm(data)),
    closeForm: () => dispatch(closeCustomerForm()),
    create: (data: Parameters<typeof createCustomer>[0]) => dispatch(createCustomer(data)),
    update: (uuid: string, data: Partial<Customer>) => dispatch(updateCustomer({ uuid, data })),
    remove: (uuid: string) => dispatch(deleteCustomer(uuid)),
    refresh: () => dispatch(fetchCustomers()),
  }
}
