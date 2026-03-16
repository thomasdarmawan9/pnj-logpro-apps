'use client'

import { Menu } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

interface TopbarProps {
  onMenuClick?: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const user = useSelector((state: RootState) => state.auth.user)

  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        height: '64px',
        backgroundColor: 'transparent',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Halo, {user?.name || 'Admin PNJ'}! 👋
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Apa yang ingin Anda pantau hari ini?
          </p>
        </div>
      </div>

      {/* Right */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
        style={{
          backgroundColor: 'rgba(45, 90, 66, 0.12)',
          color: '#2D5A42',
        }}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Sistem Aktif
      </div>
    </header>
  )
}
