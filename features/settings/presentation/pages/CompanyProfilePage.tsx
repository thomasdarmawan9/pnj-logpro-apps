'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import {
  fetchCompanyProfile, saveCompanyProfile,
  fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
  openBankForm, closeBankForm,
} from '@/store/slices/settingsSlice'
import { CompanyProfile, BankAccount } from '@/features/settings/domain/entities/SystemSetting'
import { useToast } from '@/components/toast/useToast'
import { Building2, Phone, Mail, Globe, Landmark, Plus, Pencil, Trash2, X } from 'lucide-react'

// ── Bank Account Modal ────────────────────────────────────────────────────────

interface BankFormModalProps {
  data: BankAccount | null
  isSaving: boolean
  onClose: () => void
  onSave: (values: Omit<BankAccount, 'id' | 'uuid'>) => void
}

function BankFormModal({ data, isSaving, onClose, onSave }: BankFormModalProps) {
  const [bankName, setBankName] = useState(data?.bank_name ?? '')
  const [accountNumber, setAccountNumber] = useState(data?.account_number ?? '')
  const [accountHolder, setAccountHolder] = useState(data?.account_holder ?? '')
  const [isActive, setIsActive] = useState(data?.is_active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!bankName.trim()) e.bank_name = 'Nama bank wajib diisi'
    if (!accountNumber.trim()) e.account_number = 'No. rekening wajib diisi'
    if (!accountHolder.trim()) e.account_holder = 'Atas nama wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({ bank_name: bankName.trim(), account_number: accountNumber.trim(), account_holder: accountHolder.trim(), is_active: isActive, sort_order: data?.sort_order ?? 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {data ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nama Bank <span className="text-red-500">*</span></label>
          <input className="form-input w-full" placeholder="BCA / BNI / Mandiri" value={bankName} onChange={e => setBankName(e.target.value)} />
          {errors.bank_name && <p className="text-xs text-red-500 mt-1">{errors.bank_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No. Rekening <span className="text-red-500">*</span></label>
          <input className="form-input w-full font-mono" placeholder="1234567890" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          {errors.account_number && <p className="text-xs text-red-500 mt-1">{errors.account_number}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Atas Nama <span className="text-red-500">*</span></label>
          <input className="form-input w-full" placeholder="PT. Nama Perusahaan" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
          {errors.account_holder && <p className="text-xs text-red-500 mt-1">{errors.account_holder}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            id="bank-active"
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="accent-green-600"
          />
          <label htmlFor="bank-active" className="text-sm" style={{ color: 'var(--text-primary)' }}>Aktif (tersedia di pembuatan invoice)</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CompanyProfilePage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const { company, isSaving, bankAccounts, modals } = useSelector((s: RootState) => s.settings)

  const [form, setForm] = useState<CompanyProfile | null>(null)
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin') router.replace('/dashboard')
  }, [currentUser, router])

  useEffect(() => { dispatch(fetchCompanyProfile()); dispatch(fetchBankAccounts()) }, [dispatch])

  useEffect(() => {
    if (company && !form) setForm({ ...company })
  }, [company, form])

  if (currentUser && currentUser.role !== 'super_admin') return null
  if (!form) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  const F = (key: keyof CompanyProfile, value: string | number | null) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const handleSave = async () => {
    const action = await dispatch(saveCompanyProfile(form))
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal menyimpan profil perusahaan', variant: 'error' })
    } else {
      pushToast({ title: 'Profil perusahaan berhasil disimpan', variant: 'success' })
    }
  }

  const handleBankSave = async (values: Omit<BankAccount, 'id' | 'uuid'>) => {
    const editing = modals.bankForm.data
    if (editing) {
      const action = await dispatch(updateBankAccount({ uuid: editing.uuid, data: values }))
      if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
        pushToast({ title: 'Gagal mengubah rekening', variant: 'error' })
      } else {
        pushToast({ title: 'Rekening berhasil diubah', variant: 'success' })
      }
    } else {
      const action = await dispatch(createBankAccount(values))
      if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
        pushToast({ title: 'Gagal menambah rekening', variant: 'error' })
      } else {
        pushToast({ title: 'Rekening berhasil ditambahkan', variant: 'success' })
      }
    }
  }

  const handleBankDelete = async (uuid: string) => {
    setDeletingUuid(uuid)
    const action = await dispatch(deleteBankAccount(uuid))
    setDeletingUuid(null)
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal menghapus rekening', variant: 'error' })
    } else {
      pushToast({ title: 'Rekening berhasil dihapus', variant: 'success' })
    }
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {modals.bankForm.open && (
        <BankFormModal
          data={modals.bankForm.data}
          isSaving={isSaving}
          onClose={() => dispatch(closeBankForm())}
          onSave={handleBankSave}
        />
      )}

      <div>
        <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Dashboard</span><span>/</span><span>Pengaturan</span><span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Profil Perusahaan</span>
        </nav>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profil & Data Perusahaan</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Data ini akan tampil di semua PDF (SJ dan Invoice)</p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Form Panel (left 60%) */}
        <div className="col-span-3 space-y-5">
          {/* Section 1 — Identitas */}
          <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={15} style={{ color: 'var(--green-primary)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Identitas Perusahaan</h3>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Nama Perusahaan <span className="text-red-500">*</span>
              </label>
              <input className="form-input w-full" value={form.company_name} onChange={e => F('company_name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Alamat <span className="text-red-500">*</span>
              </label>
              <textarea className="form-input w-full resize-none" rows={3} value={form.company_address} onChange={e => F('company_address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Telepon</label>
                <input className="form-input w-full" value={form.company_phone} onChange={e => F('company_phone', e.target.value)} placeholder="0858-4901-6746" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Email</label>
                <input className="form-input w-full" type="email" value={form.company_email} onChange={e => F('company_email', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Website</label>
              <input className="form-input w-full" value={form.company_website} onChange={e => F('company_website', e.target.value)} placeholder="www.perusahaan.com" />
            </div>
          </div>

          {/* Section 2 — Bank Accounts */}
          <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark size={15} style={{ color: 'var(--green-primary)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Rekening Bank</h3>
              </div>
              <button
                onClick={() => dispatch(openBankForm(null))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: 'var(--green-primary)' }}
              >
                <Plus size={13} /> Tambah Rekening
              </button>
            </div>

            {bankAccounts.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                Belum ada rekening bank. Klik &ldquo;Tambah Rekening&rdquo; untuk menambahkan.
              </p>
            ) : (
              <div className="space-y-2">
                {bankAccounts.map(bank => (
                  <div
                    key={bank.uuid}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                    style={{ borderColor: 'var(--border-card)', backgroundColor: bank.is_active ? 'var(--bg-page)' : '#F9FAFB' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{bank.bank_name}</span>
                        {!bank.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Nonaktif</span>
                        )}
                      </div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {bank.account_number} · a.n. {bank.account_holder}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => dispatch(openBankForm(bank))}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                        title="Edit"
                      >
                        <Pencil size={13} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button
                        onClick={() => handleBankDelete(bank.uuid)}
                        disabled={deletingUuid === bank.uuid}
                        className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="Hapus"
                      >
                        <Trash2 size={13} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4 — Pajak */}
          <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pengaturan Pajak Default</h3>
            <div className="flex items-center gap-3">
              <div className="flex-none">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>PPN Default (%)</label>
                <input
                  className="form-input w-24"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.default_tax_percent}
                  onChange={e => F('default_tax_percent', Number(e.target.value))}
                />
              </div>
              <p className="text-xs mt-5" style={{ color: 'var(--text-secondary)' }}>
                Default untuk customer PKP. Bisa diubah per invoice.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel (right 40%) */}
        <div className="col-span-2">
          <div className="sticky top-4 rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <h3 className="font-semibold text-xs uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)' }}>Preview Kop Surat</h3>
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-card)', backgroundColor: '#FAFAFA' }}>
              <div className="flex items-start gap-3 pb-3 mb-3 border-b" style={{ borderColor: '#E5E7EB' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pnj-logo.png"
                  alt="PNJ Logo"
                  className="w-12 h-12 object-contain rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: '#111' }}>{form.company_name || 'Nama Perusahaan'}</div>
                  <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#555' }}>
                    {form.company_address || 'Alamat perusahaan'}
                  </div>
                  {form.company_phone && (
                    <div className="flex items-center gap-1 mt-1 text-[11px]" style={{ color: '#555' }}>
                      <Phone size={9} /> {form.company_phone}
                    </div>
                  )}
                  {form.company_email && (
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: '#555' }}>
                      <Mail size={9} /> {form.company_email}
                    </div>
                  )}
                  {form.company_website && (
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: '#555' }}>
                      <Globe size={9} /> {form.company_website}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[11px]" style={{ color: '#777' }}>
                <div className="font-semibold text-[10px] uppercase tracking-wide mb-1">Rekening Pembayaran</div>
                {bankAccounts.filter(b => b.is_active).length === 0 ? (
                  <span className="italic text-gray-400">Belum ada rekening</span>
                ) : (
                  bankAccounts.filter(b => b.is_active).map(b => (
                    <div key={b.uuid}>{b.bank_name} · {b.account_number} · a.n. {b.account_holder}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <button
          onClick={() => company && setForm({ ...company })}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}
        >
          Batalkan Perubahan
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !form.company_name.trim()}
          className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Profil Perusahaan'}
        </button>
      </div>
    </div>
  )
}
