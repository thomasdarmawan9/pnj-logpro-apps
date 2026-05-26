'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
  page: number
  perPage: number
  total: number
  label: string
  onPageChange: (page: number) => void
}

export default function TablePagination({ page, perPage, total, label, onPageChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * perPage + 1
  const end = Math.min(safePage * perPage, total)

  const firstPage = Math.max(1, Math.min(safePage - 2, totalPages - 4))
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => firstPage + i)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t" style={{ borderColor: 'var(--border-card)' }}>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Menampilkan {start}-{end} dari {total} {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--border-card)' }}
          title="Halaman sebelumnya"
        >
          <ChevronLeft size={14} style={{ color: 'var(--text-primary)' }} />
        </button>

        {pageNumbers.map(pageNumber => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className="h-8 min-w-8 px-2 rounded-lg border text-xs font-medium transition-colors"
            style={{
              borderColor: pageNumber === safePage ? 'var(--green-primary)' : 'var(--border-card)',
              backgroundColor: pageNumber === safePage ? 'var(--green-primary)' : 'transparent',
              color: pageNumber === safePage ? 'white' : 'var(--text-primary)',
            }}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--border-card)' }}
          title="Halaman berikutnya"
        >
          <ChevronRight size={14} style={{ color: 'var(--text-primary)' }} />
        </button>
      </div>
    </div>
  )
}
