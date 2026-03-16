'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const sidebarWidth = isCollapsed ? 72 : 220
  // 12px margin on left side of sidebar
  const contentOffset = sidebarWidth + 12

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(prev => !prev)}
        />
      </div>

      {/* Sidebar — mobile */}
      {sidebarOpen && (
        <div className="md:hidden">
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={() => {}}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content — desktop */}
      <div
        className="hidden md:block transition-all duration-300"
        style={{ marginLeft: `${contentOffset}px` }}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6 animate-fadeIn">{children}</main>
      </div>

      {/* Main content — mobile */}
      <div className="md:hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 animate-fadeIn">{children}</main>
      </div>
    </div>
  )
}
