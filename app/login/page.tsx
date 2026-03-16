'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { Mail, Lock, Eye, EyeOff, Truck } from 'lucide-react'
import { loginSuccess, loginFailed } from '@/store/slices/authSlice'
import { MOCK_CREDENTIALS, MOCK_USER } from '@/lib/mockData'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const loginAttempts = useSelector((state: RootState) => state.auth.loginAttempts)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loginError, setLoginError] = useState('')

  const validateEmail = (val: string) => {
    if (!val) return 'Email wajib diisi'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Format email tidak valid'
    return ''
  }

  const validatePassword = (val: string) => {
    if (!val) return 'Password wajib diisi'
    if (val.length < 6) return 'Password minimal 6 karakter'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailError(eErr)
    setPasswordError(pErr)
    if (eErr || pErr) return

    if (loginAttempts >= 3) {
      setLoginError('Akun terkunci sementara. Hubungi administrator.')
      return
    }

    setIsLoading(true)
    setLoginError('')

    await new Promise(r => setTimeout(r, 1200))

    if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
      dispatch(loginSuccess(MOCK_USER))
      document.cookie = 'pnj_auth=true; path=/'
      router.push('/dashboard')
    } else {
      dispatch(loginFailed())
      const remaining = 3 - (loginAttempts + 1)
      if (remaining <= 0) {
        setLoginError('Akun terkunci sementara. Hubungi administrator.')
      } else {
        setLoginError(`Email atau password salah. Sisa percobaan: ${remaining}`)
      }
    }

    setIsLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-login-outer)' }}
    >
      {/* Decorative leaf shapes */}
      <svg
        className="absolute top-0 right-0 opacity-30 pointer-events-none"
        width="320"
        height="320"
        viewBox="0 0 320 320"
      >
        <path
          d="M320 0 C320 120 220 280 60 320 L320 320 Z"
          fill="#255C35"
        />
        <path
          d="M320 0 C280 80 200 200 100 280 C160 200 240 100 320 0 Z"
          fill="#3A8C4A"
          opacity="0.5"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 opacity-30 pointer-events-none"
        width="280"
        height="280"
        viewBox="0 0 280 280"
      >
        <path
          d="M0 280 C0 160 100 20 260 0 L0 0 Z"
          fill="#255C35"
        />
        <path
          d="M0 280 C40 200 120 80 220 20 C160 80 80 180 0 280 Z"
          fill="#3A8C4A"
          opacity="0.5"
        />
      </svg>

      <div className="relative w-full max-w-[440px] px-4">
        {/* Floating icon */}
        <div className="flex justify-center mb-0 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: '#255C35', marginBottom: '-32px' }}
          >
            <Truck size={32} color="#81C784" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl pt-12 pb-10 px-10 animate-fadeIn">
          <h1 className="text-[22px] font-bold text-center" style={{ color: 'var(--text-primary)' }}>
            Sistem Manajemen Armada
          </h1>
          <p className="text-sm text-center mt-1 mb-8" style={{ color: 'var(--text-secondary)' }}>
            Masuk untuk mengakses dashboard operasional
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Alamat Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  placeholder="email@pnj.co.id"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: emailError ? 'var(--status-danger)' : 'var(--border-card)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              {emailError && <p className="text-xs mt-1" style={{ color: 'var(--status-danger)' }}>{emailError}</p>}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                  placeholder="Masukkan password Anda"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: passwordError ? 'var(--status-danger)' : 'var(--border-card)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && <p className="text-xs mt-1" style={{ color: 'var(--status-danger)' }}>{passwordError}</p>}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between mb-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: 'var(--green-primary)' }}
                />
                Ingat saya
              </label>
              <button type="button" className="text-sm font-medium" style={{ color: 'var(--green-primary)' }}>
                Lupa password?
              </button>
            </div>

            {/* Error message */}
            {loginError && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: 'var(--status-danger)' }}>
                {loginError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || loginAttempts >= 3}
              className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: loginAttempts >= 3 ? '#9CA3AF' : 'var(--green-primary)',
              }}
              onMouseEnter={e => { if (loginAttempts < 3) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#255C35' }}
              onMouseLeave={e => { if (loginAttempts < 3) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--green-primary)' }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </>
              ) : 'Masuk'}
            </button>
          </form>

          {/* Card footer */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Belum punya akses?{' '}
            <span className="font-bold" style={{ color: 'var(--green-primary)' }}>
              Hubungi Administrator
            </span>
          </p>
        </div>
      </div>

      {/* Page footer */}
      <p className="absolute bottom-4 text-xs" style={{ color: 'rgba(165, 184, 165, 0.7)' }}>
        © 2026 PT. Pelangi Nuansa Jaya. All rights reserved.
      </p>
    </div>
  )
}
