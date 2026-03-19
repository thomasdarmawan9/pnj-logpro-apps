'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { AuditLog, ACTION_BADGE_CONFIG, MODULE_LABELS } from '@/features/reports/domain/entities/AuditLog'
import { formatDateTime, formatRelativeTime } from '@/lib/formatters'

interface AuditLogRowProps {
  log: AuditLog
  index: number
}

const COLOR_MAP: Record<string, { bg: string; color: string }> = {
  blue:   { bg: '#EFF6FF', color: '#1D4ED8' },
  green:  { bg: '#F0FDF4', color: '#15803D' },
  red:    { bg: '#FEF2F2', color: '#DC2626' },
  purple: { bg: '#FAF5FF', color: '#7C3AED' },
  teal:   { bg: '#F0FDFA', color: '#0D9488' },
  amber:  { bg: '#FFFBEB', color: '#B45309' },
  orange: { bg: '#FFF7ED', color: '#C2410C' },
  gray:   { bg: '#F9FAFB', color: '#6B7280' },
}

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  super_admin:   { bg: '#F0FDF4', color: '#15803D', label: 'Super Admin' },
  admin_ops:     { bg: '#EFF6FF', color: '#1D4ED8', label: 'Admin Ops' },
  admin_finance: { bg: '#FAF5FF', color: '#7C3AED', label: 'Admin Finance' },
}

function JsonDiffViewer({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const allKeys = Array.from(new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ]))

  if (!allKeys.length) return <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>Tidak ada detail perubahan</p>

  return (
    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
      <div>
        <div className="font-sans font-semibold mb-1 not-italic text-[11px]" style={{ color: 'var(--text-secondary)' }}>Sebelum</div>
        <div className="rounded-lg p-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}>
          {allKeys.map(k => (
            <div key={k} className="mb-0.5">
              <span style={{ color: '#B91C1C' }}>{k}</span>
              <span style={{ color: '#6B7280' }}>: </span>
              <span style={{ color: '#1A1A1A' }}>{oldData?.[k] !== undefined ? JSON.stringify(oldData[k]) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="font-sans font-semibold mb-1 not-italic text-[11px]" style={{ color: 'var(--text-secondary)' }}>Sesudah</div>
        <div className="rounded-lg p-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7' }}>
          {allKeys.map(k => (
            <div key={k} className="mb-0.5">
              <span style={{ color: '#15803D' }}>{k}</span>
              <span style={{ color: '#6B7280' }}>: </span>
              <span style={{ color: '#1A1A1A' }}>{newData?.[k] !== undefined ? JSON.stringify(newData[k]) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getSummaryDiff(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): string {
  if (!oldData && !newData) return 'Tidak ada perubahan data'
  if (!oldData) return `Dibuat: ${Object.keys(newData ?? {}).slice(0, 2).join(', ')}`
  const changed = Object.keys({ ...oldData, ...newData }).filter(k => JSON.stringify(oldData?.[k]) !== JSON.stringify(newData?.[k]))
  if (!changed.length) return 'Tidak ada perubahan'
  const first = changed[0]
  return `${first}: ${JSON.stringify(oldData?.[first] ?? null)} → ${JSON.stringify(newData?.[first] ?? null)}`
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function AuditLogRow({ log, index }: AuditLogRowProps) {
  const [expanded, setExpanded] = useState(false)

  const actionCfg = ACTION_BADGE_CONFIG[log.action] ?? { label: log.action, color: 'gray' }
  const actionStyle = COLOR_MAP[actionCfg.color] ?? COLOR_MAP.gray
  const roleBadge = ROLE_BADGE[log.user_role] ?? ROLE_BADGE.admin_ops
  const summary = getSummaryDiff(log.old_data, log.new_data)

  const hasDetail = !!(log.old_data || log.new_data)

  return (
    <>
      <tr
        style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}
        className="hover:brightness-95 transition-all"
      >
        {/* Waktu */}
        <td className="px-4 py-3">
          <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatDateTime(log.created_at)}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {formatRelativeTime(log.created_at)}
          </div>
        </td>

        {/* User & Role */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              {getInitials(log.user_name)}
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{log.user_name}</div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: roleBadge.bg, color: roleBadge.color }}>
                {roleBadge.label}
              </span>
            </div>
          </div>
        </td>

        {/* Aksi */}
        <td className="px-3 py-3">
          <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: actionStyle.bg, color: actionStyle.color }}>
            {actionCfg.label}
          </span>
        </td>

        {/* Modul */}
        <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {MODULE_LABELS[log.module] ?? log.module}
        </td>

        {/* Record */}
        <td className="px-3 py-3 text-xs">
          {log.record_label ? (
            <a
              href={`/${log.module === 'surat_jalan' ? 'surat-jalan' : log.module}/${log.record_uuid}`}
              className="font-medium hover:underline"
              style={{ color: 'var(--green-primary)' }}
            >
              {log.record_label}
            </a>
          ) : (
            <span className="italic" style={{ color: '#9CA3AF' }}>—</span>
          )}
        </td>

        {/* Detail Perubahan */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            {hasDetail && (
              <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 shrink-0">
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            <span className="text-[11px] font-mono truncate max-w-48" style={{ color: 'var(--text-secondary)' }}>
              {summary}
            </span>
          </div>
        </td>

        {/* IP */}
        <td className="px-3 py-3 font-mono text-xs" style={{ color: '#9CA3AF' }}>
          {log.ip_address ?? '—'}
        </td>
      </tr>

      {expanded && hasDetail && (
        <tr>
          <td colSpan={7} className="px-8 py-3" style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E5E7EB' }}>
            <JsonDiffViewer oldData={log.old_data} newData={log.new_data} />
          </td>
        </tr>
      )}
    </>
  )
}
