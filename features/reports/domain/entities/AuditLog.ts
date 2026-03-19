export interface AuditLog {
  id: number
  user_name: string
  user_role: string
  action: string
  module: string
  record_uuid: string | null
  record_label: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export const ACTION_BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  create_sj:      { label: 'Buat SJ',          color: 'blue'   },
  deliver_sj:     { label: 'Konfirmasi Tiba',   color: 'green'  },
  void_sj:        { label: 'Void SJ',           color: 'red'    },
  assign_sj:      { label: 'Assign SJ',         color: 'blue'   },
  create_invoice: { label: 'Buat Invoice',      color: 'blue'   },
  send_invoice:   { label: 'Kirim Invoice',     color: 'purple' },
  record_payment: { label: 'Catat Bayar',       color: 'green'  },
  void_invoice:   { label: 'Void Invoice',      color: 'red'    },
  attach_sj:      { label: 'Lampirkan SJ',      color: 'teal'   },
  detach_sj:      { label: 'Lepas SJ',          color: 'amber'  },
  stock_in:       { label: 'Stok Masuk',        color: 'green'  },
  stock_out:      { label: 'Stok Keluar',       color: 'orange' },
  login:          { label: 'Login',             color: 'gray'   },
  logout:         { label: 'Logout',            color: 'gray'   },
  update_invoice: { label: 'Edit Invoice',      color: 'amber'  },
  update_sj:      { label: 'Edit SJ',           color: 'amber'  },
}

export const MODULE_LABELS: Record<string, string> = {
  surat_jalan: 'Surat Jalan',
  invoice:     'Invoice',
  stok:        'Stok',
  auth:        'Autentikasi',
  master:      'Master Data',
  settings:    'Pengaturan',
}
