'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Receipt, Truck, FolderOpen,
  Users, User, BarChart3, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Package, CreditCard, TrendingUp, Activity, ChevronDown
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/store/slices/authSlice'
import { RootState } from '@/store'
import { StatusLampiran, StatusOperasional } from '@/features/surat-jalan/domain/entities/SuratJalan'
import { MOCK_SURAT_JALAN } from '@/lib/mockData/suratJalan'

const navItemsBase = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Surat Jalan', href: '/surat-jalan' },
  { icon: Receipt, label: 'Invoice', href: '/invoice', badge: 8, badgeColor: '#D97706' },
  { icon: Package, label: 'Manajemen Stok', href: '/stok' },
  { icon: Truck, label: 'Master Armada', href: '/master/armada' },
  { icon: FolderOpen, label: 'Proyek & Kontrak', href: '/master/proyek' },
  { icon: Users, label: 'Customer', href: '/master/customer' },
  { icon: User, label: 'Supir', href: '/master/supir' },
]

const laporanChildren = [
  { icon: CreditCard,  label: 'Aging AR',         href: '/laporan/aging-ar',    roles: ['super_admin', 'admin_finance'] },
  { icon: TrendingUp,  label: 'Profit & Loss',     href: '/laporan/profit-loss', roles: ['super_admin'] },
  { icon: Truck,       label: 'Utilisasi Armada',  href: '/laporan/utilisasi',   roles: ['super_admin'] },
  { icon: Activity,    label: 'Audit Trail',       href: '/laporan/audit-trail', roles: ['super_admin'] },
]

const bottomNavItems = [
  { icon: Settings, label: 'Pengaturan', href: '/settings/users' },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
}

export default function Sidebar({ isCollapsed, onToggleCollapse, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const sjList = useSelector((state: RootState) => state.suratJalan.list)
  const badgeCountSource = sjList.length ? sjList : MOCK_SURAT_JALAN
  const sjBadgeCount = badgeCountSource.filter(sj => sj.status === StatusOperasional.DELIVERED && sj.invoice_attachment_status === StatusLampiran.NO_INVOICE).length

  const isLaporanActive = pathname.startsWith('/laporan')
  const [laporanOpen, setLaporanOpen] = useState(isLaporanActive)

  const navItems = navItemsBase.map(item => {
    if (item.href === '/surat-jalan') {
      return { ...item, badge: sjBadgeCount || undefined, badgeColor: '#DC2626' }
    }
    return item
  })

  const visibleLaporanChildren = laporanChildren.filter(child =>
    !user || child.roles.includes(user.role)
  )

  const handleLogout = () => {
    dispatch(logout())
    document.cookie = 'pnj_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
  }

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AP'

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    return (
      <button
        onClick={() => router.push(item.href)}
        title={isCollapsed ? item.label : undefined}
        className="w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative"
        style={{
          backgroundColor: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
          color: isActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
          paddingLeft: isCollapsed ? '0' : '12px',
          paddingRight: isCollapsed ? '0' : '12px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
      >
        <item.icon size={16} className="shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge && (
              <span
                className="text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-4.5 text-center"
                style={{ backgroundColor: item.badgeColor }}
              >
                {item.badge}
              </span>
            )}
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
          </>
        )}
        {/* Badge dot when collapsed */}
        {isCollapsed && item.badge && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: item.badgeColor }}
          />
        )}
      </button>
    )
  }

  return (
    <aside
      className="fixed top-3 left-3 bottom-3 flex flex-col rounded-2xl z-40 overflow-hidden transition-all duration-300"
      style={{
        width: isCollapsed ? '72px' : '220px',
        backgroundColor: 'var(--bg-sidebar)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center py-5 shrink-0"
        style={{
          paddingLeft: isCollapsed ? '0' : '16px',
          paddingRight: isCollapsed ? '0' : '8px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: isCollapsed ? '0' : '12px',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white overflow-hidden"
        >
          <img src="/pnj-logo.png" alt="PNJ Logo" className="w-7 h-7 object-contain" />
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm leading-tight">PNJ Control</div>
              <div className="text-[11px] leading-tight" style={{ color: 'var(--text-on-dark-muted)' }}>
                Manajemen Logistik
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="md:hidden shrink-0" style={{ color: 'var(--text-on-dark-muted)' }}>
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 8px' }}>
        <div className="space-y-0.5">
          {navItems.map(item => <NavItem key={item.href} item={item} />)}
        </div>

        {/* Divider */}
        <div className="my-2 border-t" style={{ borderColor: 'rgba(165, 184, 165, 0.2)' }} />

        {/* Laporan section */}
        {!isCollapsed ? (
          <div>
            <button
              onClick={() => setLaporanOpen(o => !o)}
              className="w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 px-3"
              style={{
                backgroundColor: isLaporanActive ? 'var(--bg-sidebar-active)' : 'transparent',
                color: isLaporanActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
              }}
              onMouseEnter={e => { if (!isLaporanActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
              onMouseLeave={e => { if (!isLaporanActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              <BarChart3 size={16} className="shrink-0" />
              <span className="flex-1 text-left">Laporan</span>
              <ChevronDown
                size={12}
                className="shrink-0 transition-transform duration-200"
                style={{ transform: laporanOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {laporanOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2" style={{ borderColor: 'rgba(165, 184, 165, 0.25)' }}>
                {visibleLaporanChildren.map(child => {
                  const isActive = pathname === child.href || pathname.startsWith(child.href)
                  return (
                    <button
                      key={child.href}
                      onClick={() => router.push(child.href)}
                      className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-150"
                      style={{
                        backgroundColor: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                    >
                      <child.icon size={13} className="shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Collapsed: just the icon */
          <button
            onClick={() => router.push('/laporan/aging-ar')}
            title="Laporan"
            className="w-full flex items-center justify-center py-2.5 rounded-xl transition-all duration-150 relative"
            style={{
              backgroundColor: isLaporanActive ? 'var(--bg-sidebar-active)' : 'transparent',
              color: isLaporanActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
            }}
            onMouseEnter={e => { if (!isLaporanActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
            onMouseLeave={e => { if (!isLaporanActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <BarChart3 size={16} />
          </button>
        )}

        <div className="space-y-0.5">
          {bottomNavItems.map(item => <NavItem key={item.href} item={item} />)}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="py-4 border-t shrink-0"
        style={{
          borderColor: 'rgba(165, 184, 165, 0.2)',
          padding: isCollapsed ? '12px 8px' : '12px',
        }}
      >
        {isCollapsed ? (
          /* Collapsed footer — just avatar + logout */
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: 'var(--green-primary)' }}
              title={user?.name || 'Admin PNJ'}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-on-dark-muted)' }}
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          /* Expanded footer */
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name || 'Admin PNJ'}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-on-dark-muted)' }}>{user?.email || 'admin@pnj.co.id'}</div>
              <span
                className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--green-badge)', color: 'var(--green-accent)' }}
              >
                Super Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-on-dark-muted)' }}
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Toggle collapse button — attached to right edge of sidebar */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-150 z-50"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          color: 'var(--text-secondary)',
        }}
        title={isCollapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
