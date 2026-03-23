'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchNumberingSettings, saveNumberingSettings } from '@/store/slices/settingsSlice'
import { NumberingSettings, parseNumberFormat } from '@/features/settings/domain/entities/SystemSetting'
import { useToast } from '@/components/toast/useToast'

function NumberCard({
  title,
  format,
  onFormatChange,
  seqCurrent,
  onSeqChange,
  seqReset,
  onResetChange,
  readonly,
}: {
  title: string
  format: string
  onFormatChange?: (v: string) => void
  seqCurrent: number
  onSeqChange?: (v: number) => void
  seqReset?: 'yearly' | 'never'
  onResetChange?: (v: 'yearly' | 'never') => void
  readonly?: boolean
}) {
  const previews = useMemo(() => [
    parseNumberFormat(format, seqCurrent),
    parseNumberFormat(format, seqCurrent + 1),
    parseNumberFormat(format, seqCurrent + 2),
  ], [format, seqCurrent])

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Format Nomor</label>
        <input
          className="form-input w-full font-mono"
          value={format}
          onChange={e => onFormatChange?.(e.target.value)}
          readOnly={readonly}
          style={{ opacity: readonly ? 0.6 : 1 }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Preview hasil:</label>
        <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-card)' }}>
          {previews.map((p, i) => (
            <div key={i} className="font-mono text-sm" style={{ color: i === 0 ? 'var(--green-primary)' : 'var(--text-secondary)' }}>{p}</div>
          ))}
        </div>
      </div>

      {!readonly && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nomor Urut Sekarang</label>
            <input
              className="form-input w-full font-mono"
              type="number"
              min="0"
              value={seqCurrent}
              onChange={e => onSeqChange?.(Number(e.target.value))}
            />
          </div>
          {seqReset !== undefined && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Reset</label>
              <select className="form-input w-full" value={seqReset} onChange={e => onResetChange?.(e.target.value as 'yearly' | 'never')}>
                <option value="yearly">Setiap Tahun</option>
                <option value="never">Tidak Pernah</option>
              </select>
            </div>
          )}
        </div>
      )}

      {!readonly && (
        <div className="pt-2">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Variabel: <span className="font-mono">{'{YYYY}'}</span> = Tahun · <span className="font-mono">{'{MM}'}</span> = Bulan · <span className="font-mono">{'{DD}'}</span> = Hari · <span className="font-mono">{'{SEQ4}'}</span> = 4 digit · <span className="font-mono">{'{SEQ3}'}</span> = 3 digit · <span className="font-mono">{'{SEQ}'}</span> = tanpa padding
          </p>
        </div>
      )}
    </div>
  )
}

export default function NumberingSettingsPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const { numbering, isSaving } = useSelector((s: RootState) => s.settings)

  const [form, setForm] = useState<NumberingSettings | null>(null)

  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin') router.replace('/dashboard')
  }, [currentUser, router])

  useEffect(() => { dispatch(fetchNumberingSettings()) }, [dispatch])

  useEffect(() => {
    if (numbering && !form) setForm({ ...numbering })
  }, [numbering, form])

  if (currentUser && currentUser.role !== 'super_admin') return null
  if (!form) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  const handleSave = async () => {
    if (!confirm('Perubahan format nomor akan berlaku mulai dokumen berikutnya. Dokumen yang sudah ada tidak akan berubah. Lanjutkan?')) return
    const action = await dispatch(saveNumberingSettings(form))
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal menyimpan pengaturan nomor', variant: 'error' })
    } else {
      pushToast({ title: 'Pengaturan nomor berhasil disimpan', variant: 'success' })
    }
  }

  const F = (key: keyof NumberingSettings, value: string | number) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev)

  return (
    <div className="animate-fadeIn space-y-5">
      <div>
        <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Dashboard</span><span>/</span><span>Pengaturan</span><span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Nomor Otomatis</span>
        </nav>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Format Nomor Otomatis</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Atur format nomor dokumen sistem</p>
      </div>

      <NumberCard
        title="Surat Jalan"
        format={form.sj_format}
        onFormatChange={v => F('sj_format', v)}
        seqCurrent={form.sj_seq_current}
        onSeqChange={v => F('sj_seq_current', v)}
        seqReset={form.sj_seq_reset}
        onResetChange={v => F('sj_seq_reset', v)}
      />

      <NumberCard
        title="Invoice"
        format={form.invoice_format}
        onFormatChange={v => F('invoice_format', v)}
        seqCurrent={form.invoice_seq_current}
        onSeqChange={v => F('invoice_seq_current', v)}
        seqReset={form.invoice_seq_reset}
        onResetChange={v => F('invoice_seq_reset', v)}
      />

      <NumberCard
        title="Stok Masuk (hanya baca)"
        format={form.stock_receipt_format}
        seqCurrent={0}
        readonly
      />

      <NumberCard
        title="Stok Keluar (hanya baca)"
        format={form.stock_disburse_format}
        seqCurrent={0}
        readonly
      />

      {/* Sticky action bar */}
      <div className="sticky bottom-4 flex justify-end gap-3 p-4 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <button
          type="button"
          onClick={() => numbering && setForm({ ...numbering })}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}
        >
          Reset ke Default
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Nomor'}
        </button>
      </div>
    </div>
  )
}
