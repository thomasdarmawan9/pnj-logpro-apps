'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Pencil, Key, Unlock, ToggleLeft } from 'lucide-react'
import { AppDispatch, RootState } from '@/store'
import {
  fetchUsers, toggleUserStatus, unlockUser,
  openUserForm, closeUserForm, openResetPassword, closeResetPassword,
} from '@/store/slices/settingsSlice'
import { SystemUser, ROLE_CONFIG } from '@/features/settings/domain/entities/SystemUser'
import { useToast } from '@/components/toast/useToast'
import { formatRelativeTime } from '@/lib/formatters'
import UserFormModal from '../components/UserFormModal'
import ResetPasswordModal from '../components/ResetPasswordModal'

export default function UserManagementPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const { users, isLoading, modals } = useSelector((s: RootState) => s.settings)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin') router.replace('/dashboard')
  }, [currentUser, router])

  useEffect(() => { dispatch(fetchUsers()) }, [dispatch])

  if (currentUser && currentUser.role !== 'super_admin') return null

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const isSelf = (u: SystemUser) => u.email === currentUser?.email
  const isLocked = (u: SystemUser) => u.locked_until != null && new Date(u.locked_until) > new Date()

  const handleToggleStatus = async (user: SystemUser) => {
    if (isSelf(user)) return
    await dispatch(toggleUserStatus(user.uuid))
    pushToast({ title: `User ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, variant: 'success' })
  }

  const handleUnlock = async (user: SystemUser) => {
    await dispatch(unlockUser(user.uuid))
    pushToast({ title: 'Akun dibuka kuncinya', variant: 'success' })
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarColor = (role: string) => {
    if (role === 'super_admin') return '#D1FAE5'
    if (role === 'admin_ops') return '#DBEAFE'
    return '#EDE9FE'
  }
  const avatarText = (role: string) => {
    if (role === 'super_admin') return '#065F46'
    if (role === 'admin_ops') return '#1D4ED8'
    return '#6D28D9'
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span><span>/</span><span>Pengaturan</span><span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>User Management</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>User Management</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Kelola akun pengguna sistem</p>
        </div>
        <button
          onClick={() => dispatch(openUserForm(null))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          <Plus size={15} /> Tambah User
        </button>
      </div>

      {/* Search */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <input
          className="form-input w-full max-w-xs"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', backgroundColor: 'var(--bg-page)' }}>
                {['Nama & Email', 'Role', 'Status', 'Login Terakhir', 'Login Gagal', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const locked = isLocked(u)
                return (
                  <tr
                    key={u.uuid}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border-card)' : 'none',
                      backgroundColor: locked ? '#FFF5F5' : !u.is_active ? undefined : undefined,
                      opacity: !u.is_active ? 0.65 : 1,
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: avatarColor(u.role), color: avatarText(u.role) }}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                            {isSelf(u) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>Anda</span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: ROLE_CONFIG[u.role].bg, color: ROLE_CONFIG[u.role].text }}>
                        {ROLE_CONFIG[u.role].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                          Terkunci
                        </span>
                      ) : u.is_active ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>Aktif</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>Tidak Aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {u.last_login_at ? formatRelativeTime(u.last_login_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.login_attempt > 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                          backgroundColor: u.login_attempt >= 3 ? '#FEE2E2' : '#FEF3C7',
                          color: u.login_attempt >= 3 ? '#B91C1C' : '#92400E',
                        }}>
                          {u.login_attempt}x
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!isSelf(u) && (
                          <>
                            <button onClick={() => dispatch(openUserForm(u))} className="p-1.5 rounded-lg hover:bg-blue-50" title="Edit">
                              <Pencil size={13} className="text-blue-600" />
                            </button>
                            <button onClick={() => dispatch(openResetPassword(u.uuid))} className="p-1.5 rounded-lg hover:bg-amber-50" title="Reset Password">
                              <Key size={13} className="text-amber-600" />
                            </button>
                            {locked && (
                              <button onClick={() => handleUnlock(u)} className="p-1.5 rounded-lg hover:bg-green-50" title="Buka Kunci">
                                <Unlock size={13} className="text-green-600" />
                              </button>
                            )}
                            <button onClick={() => handleToggleStatus(u)} className="p-1.5 rounded-lg hover:bg-gray-100" title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                              <ToggleLeft size={13} style={{ color: 'var(--text-secondary)' }} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <UserFormModal
        open={modals.userForm.open}
        data={modals.userForm.data}
        onClose={() => dispatch(closeUserForm())}
      />
      <ResetPasswordModal
        open={modals.resetPassword.open}
        userUuid={modals.resetPassword.userUuid}
        users={users}
        onClose={() => dispatch(closeResetPassword())}
      />
    </div>
  )
}
