export interface ProjectOption {
  id: number
  name: string
  code: string
  customer: string
  customerId?: number
  customerUuid?: string
  contractNumber: string | null
}

export interface ArmadaOption {
  id: number
  name: string
  plate: string
  isTBD: boolean
  status: 'active' | 'inactive'
}

export interface DriverOption {
  id: number
  name: string
  simExpiredAt: string | null
  status: 'active' | 'inactive'
}
