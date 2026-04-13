export enum StatusOperasional {
  DRAFT = 'draft',
  ASSIGNED = 'assigned',
  DELIVERED = 'delivered',
  VOID = 'void',
}

export enum StatusLampiran {
  NO_INVOICE = 'no_invoice',
  ATTACHED = 'attached',
}

export interface SuratJalan {
  id: number
  uuid: string
  sj_number: string
  project_id: number
  project: {
    id: number
    name: string
    contract_number: string
    code: string
  }
  customer_id: number
  customer: {
    id: number
    name: string
  }
  fleet_id: number
  fleet: {
    id: number
    name: string
    plate_number: string
    is_tbd: boolean
  }
  driver_id: number | null
  driver: {
    id: number
    name: string
    sim_expired_at: string | null
  } | null
  driver_name_manual: string | null
  sj_date: string
  origin: string
  destination: string
  cargo_description: string | null
  operational_cost: number
  status: StatusOperasional
  invoice_id: number | null
  invoice_attachment_status: StatusLampiran
  invoice?: {
    id: number
    invoice_number: string
  } | null
  delivered_at: string | null
  pod_photo_path: string | null
  lampiran_paths: string[] | null
  void_reason: string | null
  internal_notes: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export interface StatusEvent {
  id: number
  status: StatusOperasional
  timestamp: string
  actor: string
  note: string
}

export interface SJStats {
  totalBulanIni: number
  sedangBerjalan: number
  belumDitagih: number
  draftMenunggu: number
}

export interface SJFilterState {
  search: string
  statusOps: StatusOperasional | 'all'
  statusLampiran: StatusLampiran | 'all'
  proyek: string
  customer: string
  periode: 'today' | 'week' | 'month' | 'last_month' | 'all'
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}
