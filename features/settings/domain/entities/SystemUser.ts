export type UserRole = 'super_admin' | 'admin_ops' | 'admin_finance'

export interface SystemUser {
  id: number
  uuid: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
  login_attempt: number
  locked_until: string | null
  last_login_at: string | null
  created_at: string
}

export const ROLE_CONFIG: Record<UserRole, { label: string; bg: string; text: string; description: string }> = {
  super_admin:   { label: 'Super Admin',   bg: '#D1FAE5', text: '#065F46', description: 'Akses penuh termasuk void' },
  admin_ops:     { label: 'Admin Ops',     bg: '#DBEAFE', text: '#1D4ED8', description: 'Kelola SJ & armada' },
  admin_finance: { label: 'Admin Finance', bg: '#EDE9FE', text: '#6D28D9', description: 'Kelola invoice & pembayaran' },
}

export const MOCK_USERS: SystemUser[] = [
  {
    id: 1, uuid: 'usr-001', name: 'Admin PNJ', email: 'admin@pnj.co.id',
    role: 'super_admin', is_active: true,
    login_attempt: 0, locked_until: null,
    last_login_at: '2026-03-18T08:30:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2, uuid: 'usr-002', name: 'Ops Lapangan', email: 'ops@pnj.co.id',
    role: 'admin_ops', is_active: true,
    login_attempt: 0, locked_until: null,
    last_login_at: '2026-03-18T07:15:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3, uuid: 'usr-003', name: 'Finance PNJ', email: 'finance@pnj.co.id',
    role: 'admin_finance', is_active: true,
    login_attempt: 2, locked_until: null,
    last_login_at: '2026-03-17T16:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4, uuid: 'usr-004', name: 'User Lama', email: 'lama@pnj.co.id',
    role: 'admin_ops', is_active: false,
    login_attempt: 5, locked_until: '2026-03-18T12:00:00Z',
    last_login_at: '2026-03-15T10:00:00Z',
    created_at: '2024-06-01T00:00:00Z',
  },
]
