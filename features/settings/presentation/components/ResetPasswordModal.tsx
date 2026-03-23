'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { resetUserPassword } from '@/store/slices/settingsSlice'
import { SystemUser } from '@/features/settings/domain/entities/SystemUser'
import { useToast } from '@/components/toast/useToast'

interface Props {
  open: boolean
  userUuid: string | null
  users: SystemUser[]
  onClose: () => void
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function ResetPasswordModal({ open, userUuid, users, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const { isSaving } = useSelector((s: RootState) => s.settings)
  const { push: pushToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const user = users.find(u => u.uuid === userUuid)

  useEffect(() => {
    if (open) { setPassword(generatePassword()); setConfirm('') }
  }, [open])

  if (!open || !user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { pushToast({ title: 'Password tidak cocok', variant: 'error' }); return }
    const action = await dispatch(resetUserPassword({ uuid: user.uuid, password }))
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal reset password', variant: 'error' })
    } else {
      pushToast({ title: `Password ${user.name} berhasil direset`, variant: 'success' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl animate-modalEnter" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user.name} ({user.email})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
            ⚠ Password lama akan langsung tidak berlaku setelah direset.
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Password Baru</label>
            <div className="flex gap-2">
              <input className="form-input flex-1 font-mono text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setPassword(generatePassword())} className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-card)' }}>
                <RefreshCw size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Konfirmasi Password</label>
            <input
              className="form-input w-full"
              type="text"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={{ borderColor: confirm && confirm !== password ? '#DC2626' : undefined }}
            />
            {confirm && confirm !== password && (
              <p className="text-xs mt-1 text-red-600">Password tidak cocok</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}>Batal</button>
            <button type="submit" disabled={isSaving || !password || password !== confirm} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#DC2626' }}>
              {isSaving ? 'Mereset...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
