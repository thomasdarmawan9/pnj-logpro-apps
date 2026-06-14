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
  update_sj:      { label: 'Edit SJ',           color: 'amber'  },
  assign_sj:      { label: 'Assign SJ',         color: 'blue'   },
  deliver_sj:     { label: 'Konfirmasi Tiba',   color: 'green'  },
  void_sj:        { label: 'Void SJ',           color: 'red'    },
  create_invoice: { label: 'Buat Invoice',      color: 'blue'   },
  update_invoice: { label: 'Edit Invoice',      color: 'amber'  },
  send_invoice:   { label: 'Kirim Invoice',     color: 'purple' },
  mark_outstanding: { label: 'Tandai Outstanding', color: 'amber' },
  record_payment: { label: 'Catat Bayar',       color: 'green'  },
  void_invoice:   { label: 'Void Invoice',      color: 'red'    },
  attach_sj:      { label: 'Lampirkan SJ',      color: 'teal'   },
  detach_sj:      { label: 'Lepas SJ',          color: 'amber'  },
  generate_pdf:   { label: 'Generate PDF',      color: 'purple' },
  stock_in:       { label: 'Stok Masuk',        color: 'green'  },
  stock_out:      { label: 'Stok Keluar',       color: 'orange' },
  update_stock_receipt: { label: 'Edit Stok Masuk', color: 'amber' },
  delete_stock_receipt: { label: 'Hapus Stok Masuk', color: 'red' },
  update_stock_disbursement: { label: 'Edit Stok Keluar', color: 'amber' },
  delete_stock_disbursement: { label: 'Hapus Stok Keluar', color: 'red' },
  adjust_customer_stock_balance: { label: 'Adjustment Stok Customer', color: 'purple' },
  create_stock_item: { label: 'Buat Barang Stok', color: 'blue' },
  update_stock_item: { label: 'Edit Barang Stok', color: 'amber' },
  toggle_stock_item: { label: 'Toggle Barang Stok', color: 'gray' },
  delete_stock_item: { label: 'Hapus Barang Stok', color: 'red' },
  login:          { label: 'Login',             color: 'gray'   },
  logout:         { label: 'Logout',            color: 'gray'   },
  change_password: { label: 'Ubah Password',    color: 'amber'  },
  create_user:    { label: 'Buat User',         color: 'blue'   },
  update_user:    { label: 'Edit User',         color: 'amber'  },
  toggle_user:    { label: 'Toggle User',       color: 'gray'   },
  unlock_user:    { label: 'Unlock User',       color: 'green'  },
  delete_user:    { label: 'Hapus User',        color: 'red'    },
  reset_password: { label: 'Reset Password',    color: 'amber'  },
  create_customer: { label: 'Buat Customer',    color: 'blue'   },
  update_customer: { label: 'Edit Customer',    color: 'amber'  },
  delete_customer: { label: 'Hapus Customer',   color: 'red'    },
  create_project: { label: 'Buat Proyek',       color: 'blue'   },
  update_project: { label: 'Edit Proyek',       color: 'amber'  },
  delete_project: { label: 'Hapus Proyek',      color: 'red'    },
  create_fleet:   { label: 'Buat Armada',       color: 'blue'   },
  update_fleet:   { label: 'Edit Armada',       color: 'amber'  },
  delete_fleet:   { label: 'Hapus Armada',      color: 'red'    },
  create_driver:  { label: 'Buat Supir',        color: 'blue'   },
  update_driver:  { label: 'Edit Supir',        color: 'amber'  },
  delete_driver:  { label: 'Hapus Supir',       color: 'red'    },
  update_setting: { label: 'Edit Pengaturan',   color: 'amber'  },
  upload_logo:    { label: 'Upload Logo',       color: 'blue'   },
  delete_logo:    { label: 'Hapus Logo',        color: 'red'    },
}

export const MODULE_LABELS: Record<string, string> = {
  surat_jalan: 'Surat Jalan',
  invoice:     'Invoice',
  stok:        'Stok',
  auth:        'Autentikasi',
  master:      'Master Data',
  settings:    'Pengaturan',
}
