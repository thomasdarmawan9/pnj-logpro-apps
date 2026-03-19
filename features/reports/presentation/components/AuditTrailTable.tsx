'use client'

import { AuditLog } from '@/features/reports/domain/entities/AuditLog'
import AuditLogRow from './AuditLogRow'

interface AuditTrailTableProps {
  logs: AuditLog[]
  isLoading?: boolean
  pagination: { page: number; perPage: number; total: number }
  onPageChange: (page: number) => void
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
      ))}
    </div>
  )
}

export default function AuditTrailTable({ logs, isLoading, pagination, onPageChange }: AuditTrailTableProps) {
  const totalPages = Math.ceil(pagination.total / pagination.perPage)

  if (isLoading) return <TableSkeleton />

  if (!logs.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tidak ada log audit untuk filter yang dipilih.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-light)', backgroundColor: '#F9FAFB' }}>
              {['Waktu', 'User & Role', 'Aksi', 'Modul', 'Record', 'Detail Perubahan', 'IP Address'].map((h, i) => (
                <th key={i} className="px-3 py-3 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <AuditLogRow key={log.id} log={log} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Menampilkan {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)} dari {pagination.total} log
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={pagination.page === 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            >
              ← Sebelumnya
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: pagination.page === page ? 'var(--green-primary)' : 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    color: pagination.page === page ? '#FFFFFF' : 'var(--text-primary)',
                  }}
                >
                  {page}
                </button>
              )
            })}
            <button
              disabled={pagination.page === totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
