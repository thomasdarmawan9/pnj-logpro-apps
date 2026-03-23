'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchCompanyProfile, saveCompanyProfile } from '@/store/slices/settingsSlice'
import { CompanyProfile } from '@/features/settings/domain/entities/SystemSetting'
import { useToast } from '@/components/toast/useToast'
import { Building2, Phone, Mail, Globe, Landmark } from 'lucide-react'

export default function CompanyProfilePage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const { company, isSaving } = useSelector((s: RootState) => s.settings)

  const [form, setForm] = useState<CompanyProfile | null>(null)

  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin') router.replace('/dashboard')
  }, [currentUser, router])

  useEffect(() => { dispatch(fetchCompanyProfile()) }, [dispatch])

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

  return (
    <div className="animate-fadeIn space-y-5">
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

          {/* Section 2 — Bank */}
          <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Landmark size={15} style={{ color: 'var(--green-primary)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Rekening Bank</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Nama Bank <span className="text-red-500">*</span>
                </label>
                <input className="form-input w-full" value={form.company_bank_name} onChange={e => F('company_bank_name', e.target.value)} placeholder="BCA" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  No. Rekening <span className="text-red-500">*</span>
                </label>
                <input className="form-input w-full font-mono" value={form.company_bank_account} onChange={e => F('company_bank_account', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Atas Nama</label>
                <input className="form-input w-full" value={form.company_bank_holder} onChange={e => F('company_bank_holder', e.target.value)} />
              </div>
            </div>
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
                {form.company_logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.company_logo_path} alt="logo" className="w-12 h-12 object-contain" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#D1FAE5' }}>
                    <Building2 size={20} style={{ color: '#065F46' }} />
                  </div>
                )}
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
                {form.company_bank_name} · {form.company_bank_account}
                {form.company_bank_holder && ` · a.n. ${form.company_bank_holder}`}
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
