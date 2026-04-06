'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Receipt, Truck, FolderOpen,
  Users, User, BarChart3, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Package, CreditCard, TrendingUp, Activity, ChevronDown,
  Database, UserCog, Hash, Building2
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/store/slices/authSlice'
import { RootState } from '@/store'
import { StatusLampiran, StatusOperasional } from '@/features/surat-jalan/domain/entities/SuratJalan'
import { MOCK_SURAT_JALAN } from '@/lib/mockData/suratJalan'
import { MOCK_DRIVERS } from '@/features/master/domain/entities/Driver'

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Surat Jalan', href: '/surat-jalan' },
  { icon: Receipt, label: 'Invoice', href: '/invoice' },
  { icon: Package, label: 'Manajemen Stok', href: '/stok' },
]

const masterChildren = [
  { icon: Users,      label: 'Customer',        href: '/master/customer' },
  { icon: Truck,      label: 'Armada',           href: '/master/armada'   },
  { icon: User,       label: 'Supir',            href: '/master/supir'    },
  { icon: FolderOpen, label: 'Proyek & Kontrak', href: '/master/proyek'   },
]

const laporanChildren = [
  { icon: CreditCard,  label: 'Aging AR',         href: '/laporan/aging-ar',    roles: ['super_admin', 'admin_finance'] },
  { icon: TrendingUp,  label: 'Profit & Loss',     href: '/laporan/profit-loss', roles: ['super_admin'] },
  { icon: Truck,       label: 'Utilisasi Armada',  href: '/laporan/utilisasi',   roles: ['super_admin'] },
  { icon: Activity,    label: 'Audit Trail',       href: '/laporan/audit-trail', roles: ['super_admin'] },
]

const settingsChildren = [
  { icon: UserCog,   label: 'User Management',  href: '/settings/users',     roles: ['super_admin'] },
  { icon: Hash,      label: 'Nomor Otomatis',   href: '/settings/numbering', roles: ['super_admin'] },
  { icon: Building2, label: 'Profil Perusahaan', href: '/settings/company',  roles: ['super_admin'] },
]

type NavChild = { icon: React.ElementType; label: string; href: string; roles?: string[]; badge?: number; badgeColor?: string }

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
  badgeColor?: string
  isCollapsed: boolean
  pathname: string
}

function NavItem({ href, icon: Icon, label, badge, badgeColor, isCollapsed, pathname }: NavItemProps) {
  const router = useRouter()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <button
      onClick={() => router.push(href)}
      title={isCollapsed ? label : undefined}
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
      <Icon size={16} className="shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span className="text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-4.5 text-center"
              style={{ backgroundColor: badgeColor }}>
              {badge}
            </span>
          )}
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
        </>
      )}
      {isCollapsed && badge != null && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: badgeColor }} />
      )}
    </button>
  )
}

interface CollapsibleGroupProps {
  icon: React.ElementType
  label: string
  isActive: boolean
  isOpen: boolean
  onToggle: () => void
  items: NavChild[]
  isCollapsed: boolean
  pathname: string
  userRole?: string
}

function CollapsibleGroup({ icon: Icon, label, isActive, isOpen, onToggle, items, isCollapsed, pathname, userRole }: CollapsibleGroupProps) {
  const router = useRouter()
  const visible = items.filter(c => !c.roles || !userRole || c.roles.includes(userRole))
  if (visible.length === 0) return null

  if (isCollapsed) {
    return (
      <button
        onClick={() => router.push(visible[0].href)}
        title={label}
        className="w-full flex items-center justify-center py-2.5 rounded-xl transition-all duration-150 relative"
        style={{
          backgroundColor: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
          color: isActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
      >
        <Icon size={16} />
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 px-3"
        style={{
          backgroundColor: isActive && !isOpen ? 'var(--bg-sidebar-active)' : 'transparent',
          color: isActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
      >
        <Icon size={16} className="shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={12} className="shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {isOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2" style={{ borderColor: 'rgba(165, 184, 165, 0.25)' }}>
          {visible.map(child => {
            const childActive = pathname === child.href || pathname.startsWith(child.href)
            return (
              <button
                key={child.href}
                onClick={() => router.push(child.href)}
                className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: childActive ? 'var(--bg-sidebar-active)' : 'transparent',
                  color: childActive ? '#FFFFFF' : 'var(--text-on-dark-muted)',
                }}
                onMouseEnter={e => { if (!childActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-sidebar-hover)' }}
                onMouseLeave={e => { if (!childActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <child.icon size={13} className="shrink-0" />
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.badge != null && child.badge > 0 && (
                  <span className="text-[10px] font-bold rounded-full px-1.5 text-white" style={{ backgroundColor: child.badgeColor }}>{child.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  const drivers = useSelector((state: RootState) => state.master.drivers)

  const badgeCountSource = sjList.length ? sjList : MOCK_SURAT_JALAN
  const sjBadgeCount = badgeCountSource.filter(
    sj => sj.status === StatusOperasional.DELIVERED && sj.invoice_attachment_status === StatusLampiran.NO_INVOICE
  ).length

  const driverSource = drivers.length ? drivers : MOCK_DRIVERS
  const simAlertCount = driverSource.filter(
    d => d.status === 'active' && (d.sim_status === 'expired' || d.sim_status === 'expiring_soon')
  ).length

  const isMasterActive = pathname.startsWith('/master')
  const isLaporanActive = pathname.startsWith('/laporan')
  const isSettingsActive = pathname.startsWith('/settings')

  const [masterOpen, setMasterOpen] = useState(isMasterActive)
  const [laporanOpen, setLaporanOpen] = useState(isLaporanActive)
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  const handleLogout = () => {
    dispatch(logout())
    document.cookie = 'pnj_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
  }

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AP'
  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin_ops' ? 'Admin Ops' : 'Admin Finance'

  const navWithBadges = mainNavItems.map(item => {
    if (item.href === '/surat-jalan') return { ...item, badge: sjBadgeCount || undefined, badgeColor: '#DC2626' }
    if (item.href === '/invoice') return { ...item, badge: 8, badgeColor: '#D97706' }
    return item
  })

  const masterChildrenWithBadge = masterChildren.map(c =>
    c.href === '/master/supir' ? { ...c, badge: simAlertCount || undefined, badgeColor: '#DC2626' } : c
  )

  return (
    <aside
      className="fixed top-3 left-3 bottom-3 flex flex-col rounded-2xl z-40 overflow-hidden transition-all duration-300"
      style={{ width: isCollapsed ? '72px' : '220px', backgroundColor: 'var(--bg-sidebar)' }}
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
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pnj-logo.png" alt="PNJ Logo" className="w-7 h-7 object-contain" />
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm leading-tight">PNJ Control</div>
              <div className="text-[11px] leading-tight" style={{ color: 'var(--text-on-dark-muted)' }}>Manajemen Logistik</div>
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
        {/* Main Items */}
        <div className="space-y-0.5">
          {navWithBadges.map(item => (
            <div key={item.href} data-tour={`sidebar-${item.href.replace('/', '')}`}>
              <NavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                badge={'badge' in item ? item.badge : undefined}
                badgeColor={'badgeColor' in item ? item.badgeColor : undefined}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            </div>
          ))}
        </div>

        <div className="my-2 border-t" style={{ borderColor: 'rgba(165, 184, 165, 0.2)' }} />

        {/* Master Data Group */}
        <div data-tour="sidebar-master">
          <CollapsibleGroup
            icon={Database}
            label="Master Data"
            isActive={isMasterActive}
            isOpen={masterOpen}
            onToggle={() => setMasterOpen(o => !o)}
            items={masterChildrenWithBadge}
            isCollapsed={isCollapsed}
            pathname={pathname}
            userRole={user?.role}
          />
        </div>

        <div className="my-1" />

        {/* Laporan Group */}
        <CollapsibleGroup
          icon={BarChart3}
          label="Laporan"
          isActive={isLaporanActive}
          isOpen={laporanOpen}
          onToggle={() => setLaporanOpen(o => !o)}
          items={laporanChildren}
          isCollapsed={isCollapsed}
          pathname={pathname}
          userRole={user?.role}
        />

        <div className="my-1" />

        {/* Settings Group */}
        <CollapsibleGroup
          icon={Settings}
          label="Pengaturan"
          isActive={isSettingsActive}
          isOpen={settingsOpen}
          onToggle={() => setSettingsOpen(o => !o)}
          items={settingsChildren}
          isCollapsed={isCollapsed}
          pathname={pathname}
          userRole={user?.role}
        />
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
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: 'var(--green-primary)' }} title={user?.name || 'Admin PNJ'}>
              {initials}
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-on-dark-muted)' }} title="Keluar">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: 'var(--green-primary)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name || 'Admin PNJ'}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-on-dark-muted)' }}>{user?.email || 'admin@pnj.co.id'}</div>
              <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--green-badge)', color: 'var(--green-accent)' }}>
                {roleLabel}
              </span>
            </div>
            <button onClick={handleLogout} className="shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-on-dark-muted)' }} title="Keluar">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Toggle collapse button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-150 z-50"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        title={isCollapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
