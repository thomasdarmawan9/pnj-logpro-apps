'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { createUser, updateUser } from '@/store/slices/settingsSlice'
import { SystemUser, UserRole, ROLE_CONFIG } from '@/features/settings/domain/entities/SystemUser'
import { useToast } from '@/components/toast/useToast'

interface Props {
  open: boolean
  data: SystemUser | null
  onClose: () => void
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function UserFormModal({ open, data, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const { isSaving } = useSelector((s: RootState) => s.settings)
  const { push: pushToast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('admin_ops')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) {
      setName(data?.name ?? '')
      setEmail(data?.email ?? '')
      setRole(data?.role ?? 'admin_ops')
      setPassword(data ? '' : generatePassword())
    }
  }, [open, data])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (data) {
      const action = await dispatch(updateUser({ uuid: data.uuid, data: { name, email, role } }))
      if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
        pushToast({ title: (action.payload as string) || 'Gagal memperbarui user', variant: 'error' })
      } else {
        pushToast({ title: 'User diperbarui', variant: 'success' })
      }
    } else {
      const action = await dispatch(createUser({ name, email, role, is_active: true }))
      if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
        pushToast({ title: (action.payload as string) || 'Gagal menambahkan user', variant: 'error' })
      } else {
        pushToast({ title: 'User berhasil ditambahkan', variant: 'success' })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl animate-modalEnter" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data ? 'Edit User' : 'Tambah User'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input className="form-input w-full" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Email <span className="text-red-500">*</span>
            </label>
            <input className="form-input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_CONFIG) as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="p-3 rounded-xl text-left transition-all border"
                  style={{
                    backgroundColor: role === r ? ROLE_CONFIG[r].bg : 'var(--bg-page)',
                    borderColor: role === r ? ROLE_CONFIG[r].text : 'var(--border-card)',
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: role === r ? ROLE_CONFIG[r].text : 'var(--text-primary)' }}>
                    {role === r ? '● ' : '○ '}{ROLE_CONFIG[r].label}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {ROLE_CONFIG[r].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Password field — only for new users */}
          {!data && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Password Sementara <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input className="form-input flex-1 font-mono text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="px-3 py-2 rounded-xl text-sm transition-all"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
                  title="Generate Ulang"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>User akan diminta ganti password saat login pertama.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}>Batal</button>
            <button type="submit" disabled={isSaving || !name.trim() || !email.trim()} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--green-primary)' }}>
              {isSaving ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
