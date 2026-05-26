'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, FolderOpen, Filter, RotateCcw, ChevronDown } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useCustomer } from '../hooks/useCustomer'
import CustomerFormModal from '../components/CustomerFormModal'
import { useToast } from '@/components/toast/useToast'
import { formatRupiah } from '@/lib/formatters'
import { Customer } from '@/features/master/domain/entities/Customer'
import TablePagination from '../components/TablePagination'

const ROWS_PER_PAGE = 10

export default function CustomerListPage() {
  const { customers, isLoading, modal, openForm, closeForm, create, update, remove } = useCustomer()
  const { push: pushToast } = useToast()
  const user = useSelector((s: RootState) => s.auth.user)
  const canEdit = user?.role !== 'admin_finance'

  const [search, setSearch] = useState('')
  const [filterPKP, setFilterPKP] = useState<'all' | 'pkp' | 'non_pkp'>('all')
  const [filterPiutang, setFilterPiutang] = useState<'all' | 'ada' | 'tidak'>('all')
  const [page, setPage] = useState(1)

  const resetFilters = () => { setSearch(''); setFilterPKP('all'); setFilterPiutang('all'); setPage(1) }

  const filtered = useMemo(() => customers.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) ||
      (c.pic_name?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.npwp?.toLowerCase().includes(q))
    const matchPKP = filterPKP === 'all' || (filterPKP === 'pkp' ? c.is_pkp : !c.is_pkp)
    const matchPiutang = filterPiutang === 'all' ||
      (filterPiutang === 'ada' ? c.total_invoice_outstanding > 0 : c.total_invoice_outstanding === 0)
    return matchSearch && matchPKP && matchPiutang
  }), [customers, search, filterPKP, filterPiutang])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  const handleSubmit = async (data: Parameters<typeof create>[0]) => {
    const action = modal.data
      ? await update(modal.data.uuid, data as Partial<Customer>)
      : await create(data)
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: (action as { payload?: string }).payload || 'Gagal menyimpan customer', variant: 'error' })
    } else {
      pushToast({ title: modal.data ? 'Customer diperbarui' : 'Customer berhasil ditambahkan', variant: 'success' })
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Hapus "${customer.name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    const action = await remove(customer.uuid)
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: (action as { payload?: string }).payload || 'Gagal menghapus customer', variant: 'error' })
    } else {
      pushToast({ title: 'Customer dihapus', variant: 'success' })
    }
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div data-tour="customer-header" className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span><span>/</span><span>Master Data</span><span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Customer</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Customer</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {customers.length} customer terdaftar
          </p>
        </div>
        {canEdit && (
          <button
            data-tour="customer-add-btn"
            onClick={() => openForm(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <Plus size={15} /> Tambah Customer
          </button>
        )}
      </div>

      {/* Filter */}
      <div data-tour="customer-filter" className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="form-input w-full"
              placeholder="Cari nama, PIC, email, NPWP..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Filter size={14} className="text-gray-500" />
            Filter
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <div className="text-xs text-gray-600">Status PKP</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterPKP} onChange={e => { setFilterPKP(e.target.value as typeof filterPKP); setPage(1) }}>
                <option value="all">Semua</option>
                <option value="pkp">PKP</option>
                <option value="non_pkp">Non-PKP</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Piutang</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterPiutang} onChange={e => { setFilterPiutang(e.target.value as typeof filterPiutang); setPage(1) }}>
                <option value="all">Semua</option>
                <option value="ada">Ada Piutang</option>
                <option value="tidak">Tidak Ada Piutang</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div data-tour="customer-table" className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">Tidak ada customer ditemukan</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', backgroundColor: 'var(--bg-page)' }}>
                  {['Nama & PIC', 'Kontak', 'NPWP', 'PKP', 'Proyek Aktif', 'Piutang', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, i) => (
                  <tr
                    key={c.uuid}
                    style={{
                      borderBottom: i < paginated.length - 1 ? '1px solid var(--border-card)' : 'none',
                    }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.pic_name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs" style={{ color: 'var(--text-primary)' }}>{c.phone ?? '—'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {c.npwp ? (
                      <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{c.npwp}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>Belum diisi</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_pkp ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>PKP</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>Non-PKP</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.active_project_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.total_invoice_outstanding > 0 ? (
                      <span className="font-semibold text-sm text-red-600">{formatRupiah(c.total_invoice_outstanding)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => openForm(c)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={13} className="text-red-500" />
                          </button>
                        </>
                      )}
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Lihat Proyek"
                      >
                        <FolderOpen size={13} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination page={currentPage} perPage={ROWS_PER_PAGE} total={filtered.length} label="customer" onPageChange={setPage} />
          </>
        )}
      </div>

      <CustomerFormModal
        open={modal.open}
        data={modal.data}
        isLoading={isLoading}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
