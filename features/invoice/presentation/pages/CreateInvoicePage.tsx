'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, ArrowLeft, Info } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { createInvoice } from '@/store/slices/invoiceSlice'
import { fetchBankAccounts } from '@/store/slices/settingsSlice'
import { useToast } from '@/components/toast/useToast'
import { validateCreateInvoice } from '../../application/validators/InvoiceValidator'
import useInvoiceForm from '../hooks/useInvoiceForm'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import InvoiceItemRow from '../components/InvoiceItemRow'
import InvoiceTaxCalculator from '../components/InvoiceTaxCalculator'
import DownPaymentForm from '../components/DownPaymentForm'
import type { CreateDownPaymentDto } from '../../application/dto/CreateInvoiceDto'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const role = useSelector((state: RootState) => state.auth.user?.role ?? 'super_admin')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'check'>('transfer')
  const [bankAccountId, setBankAccountId] = useState<number | null>(null)
  const [downPayment, setDownPayment] = useState<CreateDownPaymentDto | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const bankAccounts = useSelector((state: RootState) => state.settings.bankAccounts).filter(b => b.is_active)

  const {
    header, taxPercent, taxEnabled, pphPercent, pphEnabled,
    selectedProject, updateHeader, selectProject,
    toggleTax, setTaxPercent, togglePph, setPphPercent,
    isDueDatePast, projects,
  } = useInvoiceForm()

  const {
    items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, calculateTax, totalAmount,
  } = useInvoiceItems()

  useEffect(() => {
    if (role === 'admin_ops') {
      pushToast({ title: 'Akses Ditolak', description: 'Anda tidak memiliki akses ke halaman ini.', variant: 'error' })
      router.replace('/dashboard')
    }
  }, [role, router, pushToast])

  useEffect(() => { dispatch(fetchBankAccounts()) }, [dispatch])

  useEffect(() => {
    if (bankAccounts.length > 0 && bankAccountId === null) {
      setBankAccountId(bankAccounts[0].id)
    }
  }, [bankAccounts, bankAccountId])

  if (role === 'admin_ops') return null

  const taxAmount = taxEnabled ? calculateTax(subtotalAmount, taxPercent) : 0
  const pphAmount = pphEnabled ? Math.round(subtotalAmount * pphPercent / 100) : 0
  const nettoAmount = totalAmount(subtotalAmount, taxAmount) - pphAmount

  const getDto = (sendImmediately = false) => ({
    project_id: header.project_id!,
    invoice_date: header.invoice_date,
    due_date: header.due_date,
    payment_method: paymentMethod,
    bank_account_id: paymentMethod === 'transfer' ? bankAccountId : null,
    tax_percent: taxEnabled ? taxPercent : 0,
    pph_percent: pphEnabled ? pphPercent : 0,
    notes: header.notes || null,
    items: items.map((item, idx) => ({
      fleet_id: item.fleet_id ?? null,
      fleet_label: item.fleet_label,
      description: item.description,
      period_start: item.period_start,
      period_end: item.period_end,
      qty: item.qty,
      unit: item.unit,
      unit_price: item.unit_price,
      sort_order: idx,
    })),
    send_immediately: sendImmediately,
    // Saat create, kirim DP kalau ada (toggle ON dengan amount > 0).
    // Kalau `null` kita skip key — BE tidak butuh field ini saat create kosong.
    ...(downPayment ? { down_payment: downPayment } : {}),
  })

  const validate = () => {
    const result = validateCreateInvoice(getDto())
    if (downPayment) {
      if (!downPayment.payment_date) result.errors.down_payment = 'Tanggal DP wajib diisi'
      if (downPayment.amount <= 0) result.errors.down_payment = 'Nominal DP harus lebih dari 0'
      if (downPayment.amount > nettoAmount) result.errors.down_payment = `Nominal DP tidak boleh melebihi total invoice (${formatRupiah(nettoAmount)})`
      result.valid = Object.keys(result.errors).length === 0
    }
    setErrors(result.errors)
    if (!result.valid) {
      pushToast({
        title: 'Invoice belum lengkap',
        description: Object.values(result.errors)[0] || 'Lengkapi data invoice terlebih dahulu.',
        variant: 'error',
      })
    }
    return result.valid
  }

  const handleSaveDraft = async () => {
    if (isSubmitting || !validate()) return
    setIsSubmitting(true)
    const result = await dispatch(createInvoice(getDto(false)))
    setIsSubmitting(false)
    if (createInvoice.fulfilled.match(result)) {
      pushToast({ title: 'Invoice Disimpan', description: `Invoice #${result.payload.invoice_number} berhasil dibuat sebagai draft.`, variant: 'success' })
      router.push('/invoice')
      return
    }
    pushToast({ title: 'Gagal membuat invoice', description: (result.payload as string) || 'Invoice tidak tersimpan.', variant: 'error' })
  }

  const handleSaveAndSend = async () => {
    if (isSubmitting || !validate()) return
    setIsSubmitting(true)
    const result = await dispatch(createInvoice(getDto(true)))
    setIsSubmitting(false)
    if (createInvoice.fulfilled.match(result)) {
      pushToast({ title: 'Invoice Dikirim', description: `Invoice #${result.payload.invoice_number} berhasil dibuat dan dikirim.`, variant: 'success' })
      router.push('/invoice')
      return
    }
    pushToast({ title: 'Gagal membuat invoice', description: (result.payload as string) || 'Invoice tidak tersimpan.', variant: 'error' })
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} />
          Kembali ke Daftar
        </button>
        <div className="text-xs text-gray-500">Dashboard / Invoice / Buat Invoice Baru</div>
        <h1 className="text-2xl font-bold">Buat Invoice Baru</h1>
      </div>

      <div ref={formRef} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Section A: Header */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Header Invoice</h2>
            <div className="space-y-4">
              {/* Pilih Proyek */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Pilih Proyek *</label>
                <select
                  className={`form-input w-full ${errors.project_id ? 'border-red-400' : ''}`}
                  value={header.project_id ?? ''}
                  onChange={e => { selectProject(Number(e.target.value)); setErrors(prev => ({ ...prev, project_id: '' })) }}
                >
                  <option value="">-- Pilih proyek --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name} — {p.customer.name}</option>
                  ))}
                </select>
                {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id}</p>}
              </div>

              {selectedProject && (
                <>
                  {/* Customer (readonly) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Customer</label>
                    <div className="form-input bg-gray-50 flex items-center gap-2">
                      <span>{selectedProject.customer.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-auto" style={{ backgroundColor: selectedProject.customer.is_pkp ? '#DCFCE7' : '#F3F4F6', color: selectedProject.customer.is_pkp ? '#166534' : '#6B7280' }}>
                        {selectedProject.customer.is_pkp ? 'PKP' : 'Non-PKP'}
                      </span>
                    </div>
                    {selectedProject.customer.npwp && <p className="text-xs text-gray-500 mt-1">NPWP: {selectedProject.customer.npwp}</p>}
                  </div>

                  {/* No. Kontrak (readonly) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">No. Kontrak</label>
                    <div className="form-input bg-gray-50 text-gray-500 italic">{selectedProject.contract_number}</div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Invoice *</label>
                  <input type="date" className={`form-input w-full ${errors.invoice_date ? 'border-red-400' : ''}`} value={header.invoice_date} onChange={e => updateHeader('invoice_date', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Jatuh Tempo *</label>
                  <input type="date" className={`form-input w-full ${errors.due_date ? 'border-red-400' : ''}`} value={header.due_date} onChange={e => updateHeader('due_date', e.target.value)} />
                  {isDueDatePast && <p className="text-xs text-amber-600 mt-1">⚠ Tanggal jatuh tempo sudah terlewat</p>}
                </div>
              </div>

              {/* No. Invoice (readonly) */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">No. Invoice</label>
                <div className="form-input bg-gray-50 text-gray-500 italic font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                  (otomatis oleh sistem)
                </div>
                <p className="text-xs text-gray-400 mt-1">Nomor akan digenerate saat invoice disimpan</p>
              </div>

              {/* Catatan */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Catatan ke Customer</label>
                <textarea className="form-input w-full text-sm" rows={2} value={header.notes} onChange={e => updateHeader('notes', e.target.value)} placeholder="Catatan tambahan yang akan tampil di invoice..." />
              </div>
            </div>
          </div>

          {/* Section B: Items */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold">Rincian Item</h2>
              <button onClick={addItem} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
                <Plus size={14} />
                Tambah Item
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Tambahkan baris item untuk setiap unit kendaraan</p>
            {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}

            {items.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl py-12 text-center" style={{ borderColor: 'var(--border-card)' }}>
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 font-medium">Belum ada item</p>
                <p className="text-xs text-gray-400 mt-1">Klik &ldquo;+ Tambah Item&rdquo; untuk menambahkan unit kendaraan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <InvoiceItemRow
                    key={item.uuid}
                    item={item}
                    index={idx}
                    onChange={updateItem}
                    onRemove={removeItem}
                    errors={errors}
                    onDragStart={i => setDragFrom(i)}
                    onDragOver={i => setDragOver(i)}
                    onDrop={() => {
                      if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
                        reorderItems(dragFrom, dragOver)
                      }
                      setDragFrom(null)
                      setDragOver(null)
                    }}
                  />
                ))}
              </div>
            )}

            {items.length > 0 && (
              <button
                onClick={addItem}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:bg-green-50"
                style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
              >
                <Plus size={16} />
                Tambah Item
              </button>
            )}
          </div>

          {/* Section C: Tax */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Kalkulasi Pajak</h2>
            <InvoiceTaxCalculator
              subtotal={subtotalAmount}
              taxPercent={taxPercent}
              taxEnabled={taxEnabled}
              pphPercent={pphPercent}
              pphEnabled={pphEnabled}
              isPkp={selectedProject?.customer.is_pkp}
              onToggleTax={toggleTax}
              onChangeTaxPercent={setTaxPercent}
              onTogglePph={togglePph}
              onChangePphPercent={setPphPercent}
            />
          </div>

          {/* Section D: Metode Pembayaran */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Metode Pembayaran *</h2>
            <div className="flex gap-2">
              {([
                { value: 'transfer', label: 'Transfer Bank' },
                { value: 'cash',     label: 'Tunai' },
                { value: 'check',    label: 'Cek/Giro' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(opt.value)
                    setErrors(prev => ({ ...prev, payment_method: '', bank_account_id: '' }))
                  }}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === opt.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.payment_method && <p className="text-xs text-red-500 mt-2">{errors.payment_method}</p>}

            {paymentMethod === 'transfer' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Rekening Tujuan <span className="text-red-500">*</span>
                </label>
                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Belum ada rekening bank. Tambahkan di <strong>Pengaturan → Profil Perusahaan</strong>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bankAccounts.map(bank => (
                      <label
                        key={bank.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                          bankAccountId === bank.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bank_account"
                          checked={bankAccountId === bank.id}
                          onChange={() => { setBankAccountId(bank.id); setErrors(prev => ({ ...prev, bank_account_id: '' })) }}
                          className="accent-green-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bank.bank_name}</div>
                          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {bank.account_number} · a.n. {bank.account_holder}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.bank_account_id && <p className="text-xs text-red-500 mt-2">{errors.bank_account_id}</p>}
              </div>
            )}
          </div>

          {/* Section E: Down Payment (Uang Muka) */}
          <DownPaymentForm
            totalAmount={nettoAmount}
            initialValue={downPayment}
            onChange={setDownPayment}
            defaultDate={header.invoice_date}
            paymentMethod={paymentMethod}
          />
          {errors.down_payment && <p className="text-xs text-red-500 -mt-2">{errors.down_payment}</p>}
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <div className="bg-white rounded-xl border p-5 sticky top-20" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Pratinjau Invoice</h3>
            <div className="text-xs space-y-1.5 font-mono border rounded-lg p-4" style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--border-card)', backgroundColor: '#FAFAFA' }}>
              <div className="text-center font-bold text-gray-700 mb-2">── PT. PELANGI NUANSA JAYA ──</div>
              <div><span className="text-gray-400">Invoice # :</span> (auto)</div>
              <div><span className="text-gray-400">Kepada    :</span> {selectedProject?.customer.name ?? '—'}</div>
              <div><span className="text-gray-400">Kontrak   :</span> {selectedProject?.contract_number ?? '—'}</div>
              <div><span className="text-gray-400">Tgl       :</span> {header.invoice_date}</div>
              <div><span className="text-gray-400">Jth Tempo :</span> {header.due_date}</div>
              <div className="border-t my-2" style={{ borderColor: 'var(--border-card)' }} />
              <div className="text-gray-500">{items.length} baris item</div>
              <div className="border-t my-2" style={{ borderColor: 'var(--border-card)' }} />
              <div><span className="text-gray-400">Sub Total :</span> {formatRupiah(subtotalAmount)}</div>
              {taxEnabled && <div><span className="text-gray-400">PPN {taxPercent}%  :</span> + {formatRupiah(taxAmount)}</div>}
              {pphEnabled && <div style={{ color: '#DC2626' }}><span className="text-gray-400">PPh {pphPercent}%  :</span> − {formatRupiah(pphAmount)}</div>}
              <div className="font-bold"><span className="text-gray-400">NETTO     :</span> {formatRupiah(nettoAmount)}</div>
              {downPayment && downPayment.amount > 0 && (
                <>
                  <div style={{ color: '#15803D' }}><span className="text-gray-400">DP        :</span> − {formatRupiah(downPayment.amount)}</div>
                  <div className="font-bold"><span className="text-gray-400">SISA      :</span> {formatRupiah(Math.max(0, nettoAmount - downPayment.amount))}</div>
                </>
              )}
            </div>
          </div>

          {/* Customer info */}
          {selectedProject && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Info Customer</h3>
              <div className="text-sm font-semibold">{selectedProject.customer.name}</div>
              {selectedProject.customer.address && <div className="text-xs text-gray-500 mt-0.5">{selectedProject.customer.address}</div>}
              {selectedProject.customer.npwp && <div className="text-xs text-gray-500 mt-0.5">NPWP: {selectedProject.customer.npwp}</div>}
              <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: selectedProject.customer.is_pkp ? '#DCFCE7' : '#F3F4F6', color: selectedProject.customer.is_pkp ? '#166534' : '#6B7280' }}>
                {selectedProject.customer.is_pkp ? 'PKP' : 'Non-PKP'}
              </span>
            </div>
          )}

          {/* SJ info */}
          {selectedProject && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}>
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">Ada SJ di proyek ini yang bisa dilampirkan ke invoice setelah disimpan.</p>
                  <p className="text-xs text-blue-600 mt-1">Lampirkan SJ dilakukan setelah invoice dibuat.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--border-card)' }}>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
        <button
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-xl border text-sm font-medium disabled:opacity-40"
          style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan sebagai Draft'}
        </button>
        <button
          onClick={handleSaveAndSend}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan & Kirim ke Customer →'}
        </button>
      </div>
      <div className="h-20" /> {/* Spacer for sticky bar */}
    </DashboardLayout>
  )
}
