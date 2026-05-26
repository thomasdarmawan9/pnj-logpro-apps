'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, ArrowLeft, Pencil, Truck, KeyRound } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { updateInvoice } from '@/store/slices/invoiceSlice'
import { fetchBankAccounts } from '@/store/slices/settingsSlice'
import { useToast } from '@/components/toast/useToast'
import { InvoiceStatus } from '../../domain/entities/Invoice'
import { validateUpdateInvoice } from '../../application/validators/InvoiceValidator'
import useInvoiceDetail from '../hooks/useInvoiceDetail'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import InvoiceItemRow from '../components/InvoiceItemRow'
import InvoiceTaxCalculator from '../components/InvoiceTaxCalculator'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'
import InvoiceLampiranUploadZone from '../components/InvoiceLampiranUploadZone'
import DownPaymentForm from '../components/DownPaymentForm'
import type { CreateDownPaymentDto } from '../../application/dto/CreateInvoiceDto'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface Props { uuid: string }

export default function EditInvoicePage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const role = useSelector((state: RootState) => state.auth.user?.role ?? 'super_admin')
  const { invoice, isLoading } = useInvoiceDetail(uuid)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taxPercent, setTaxPercent] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [pphPercent, setPphPercent] = useState(2)
  const [pphEnabled, setPphEnabled] = useState(false)
  const [insuranceEnabled, setInsuranceEnabled] = useState(false)
  const [insuranceAmount, setInsuranceAmount] = useState(0)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [lampiranPaths, setLampiranPaths] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'check'>('transfer')
  const [bankAccountId, setBankAccountId] = useState<number | null>(null)
  const [downPayment, setDownPayment] = useState<CreateDownPaymentDto | null>(null)
  const bankAccounts = useSelector((state: RootState) => state.settings.bankAccounts).filter(b => b.is_active)
  // Invoice yang status-nya DRAFT bisa di-edit penuh.
  // Invoice non-DRAFT (sent/outstanding/paid) hanya boleh edit DP.
  // Invoice VOID tidak bisa di-edit sama sekali.
  const isDraft = invoice?.status === InvoiceStatus.DRAFT
  const fullEditable = isDraft

  const { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, calculateTax, totalAmount } = useInvoiceItems()

  useEffect(() => {
    if (invoice) {
      if (invoice.status === InvoiceStatus.VOID) {
        pushToast({ title: 'Tidak dapat diedit', description: 'Invoice void tidak dapat di-edit.', variant: 'error' })
        router.replace(`/invoice/${uuid}`)
        return
      }
      setDueDate(invoice.due_date)
      setNotes(invoice.notes ?? '')
      setPaymentMethod(invoice.payment_method ?? 'transfer')
      setBankAccountId(invoice.bank_account_id ?? null)
      setLampiranPaths(invoice.lampiran_paths ?? [])
      setTaxPercent(invoice.tax_percent)
      setTaxEnabled(invoice.tax_percent > 0)
      setPphPercent(invoice.pph_percent > 0 ? invoice.pph_percent : 2)
      setPphEnabled(invoice.pph_percent > 0)
      setInsuranceAmount(invoice.insurance_amount > 0 ? invoice.insurance_amount : 0)
      setInsuranceEnabled(invoice.insurance_amount > 0)

      // Pre-fill DP form dengan DP existing kalau ada.
      if (invoice.down_payment) {
        setDownPayment({
          payment_date: invoice.down_payment.payment_date,
          amount:       invoice.down_payment.amount,
          method:       invoice.down_payment.method,
          notes:        invoice.down_payment.notes,
        })
      } else {
        setDownPayment(null)
      }

      resetItems(invoice.items.map(item => ({
        uuid: item.uuid,
        fleet_id: item.fleet_id ?? null,
        fleet: item.fleet ?? null,
        fleet_label: item.fleet_label,
        description: item.description,
        period_start: item.period_start,
        period_end: item.period_end,
        qty: item.qty,
        unit: item.unit,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        sort_order: item.sort_order,
        source_sj_id: item.source_sj_id,
      })))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice])

  useEffect(() => { dispatch(fetchBankAccounts()) }, [dispatch])

  if (role === 'admin_ops') {
    router.replace('/dashboard')
    return null
  }

  const taxAmount = taxEnabled ? calculateTax(subtotalAmount, taxPercent) : 0
  const pphAmount = pphEnabled ? Math.round(subtotalAmount * pphPercent / 100) : 0
  const nettoAmount = totalAmount(subtotalAmount, taxAmount) - pphAmount + (insuranceEnabled ? insuranceAmount : 0)
  const today = new Date().toISOString().split('T')[0]
  const isDueDatePast = dueDate < today

  const toggleInsurance = (enabled: boolean) => {
    setInsuranceEnabled(enabled)
    if (!enabled) setInsuranceAmount(0)
  }

  const handleSave = async () => {
    // DP payload — selalu disertakan (kalau berubah dari current).
    // null = clear DP, object = upsert.
    const dpPayload = downPayment === null ? null : { ...downPayment }

    if (dpPayload) {
      const nextErrors: Record<string, string> = {}
      if (!dpPayload.payment_date) nextErrors.down_payment = 'Tanggal DP wajib diisi'
      if (dpPayload.amount <= 0) nextErrors.down_payment = 'Nominal DP harus lebih dari 0'
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        pushToast({ title: 'DP belum valid', description: nextErrors.down_payment, variant: 'error' })
        return
      }
    }

    let dto: Record<string, unknown>
    if (fullEditable) {
      dto = {
        due_date: dueDate,
        notes: notes || null,
        payment_method: paymentMethod,
        bank_account_id: paymentMethod === 'transfer' ? bankAccountId : null,
        tax_percent: taxEnabled ? taxPercent : 0,
        pph_percent: pphEnabled ? pphPercent : 0,
        insurance_amount: insuranceEnabled ? insuranceAmount : 0,
        lampiran_paths: lampiranPaths.length > 0 ? lampiranPaths : null,
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
        down_payment: dpPayload,
      }
      const result = validateUpdateInvoice(dto as Parameters<typeof validateUpdateInvoice>[0], invoice?.service_type)
      setErrors(result.errors)
      if (!result.valid) return
    } else {
      // Non-draft: hanya kirim down_payment field. BE bypass FINAL_STATUSES check
      // kalau payload hanya berisi down_payment.
      dto = { down_payment: dpPayload }
    }

    const action = await dispatch(updateInvoice({ uuid, dto: dto as Parameters<typeof validateUpdateInvoice>[0] }))
    if (updateInvoice.fulfilled.match(action)) {
      pushToast({ title: 'Invoice Disimpan', description: `Invoice #${invoice?.invoice_number} berhasil diperbarui.`, variant: 'success' })
      router.push(`/invoice/${uuid}`)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div className="text-xs text-gray-500">Dashboard / Invoice / #{invoice?.invoice_number} / Edit</div>
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
      </div>

      {/* Edit banner */}
      <div className="mb-4 rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: fullEditable ? '#FDE68A' : '#BAE6FD', backgroundColor: fullEditable ? '#FFFBEB' : '#F0F9FF' }}>
        <Pencil size={16} style={{ color: fullEditable ? '#D97706' : '#0369A1' }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: fullEditable ? '#92400E' : '#0C4A6E' }}>
            {fullEditable
              ? `Mode Edit Penuh — Invoice #${invoice?.invoice_number}`
              : `Mode Edit DP — Invoice #${invoice?.invoice_number}`
            }
          </div>
          <div className="text-xs" style={{ color: fullEditable ? '#B45309' : '#075985' }}>
            {fullEditable
              ? 'Anda sedang mengedit invoice draft. Perubahan belum disimpan.'
              : 'Invoice sudah dirilis. Hanya DP/Uang Muka yang bisa diedit. Item & pajak terkunci.'
            }
          </div>
        </div>
        <InvoiceStatusBadge status={invoice?.status ?? 'draft'} size="sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Header (partial edit) */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Header Invoice</h2>
            <div className="space-y-4">
              {/* Readonly */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Proyek</label>
                <div className="form-input bg-gray-50 text-gray-500">{invoice?.project ? `${invoice.project.code} — ${invoice.project.name}` : 'Tanpa proyek'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Customer</label>
                <div className="form-input bg-gray-50 text-gray-500">{invoice?.customer.name}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">No. Invoice</label>
                <div className="form-input bg-gray-50 text-gray-500 italic font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{invoice?.invoice_number}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Jenis Jasa</label>
                <div className="form-input bg-gray-50 text-gray-600 flex items-center gap-2">
                  {invoice?.service_type === 'rental' ? <KeyRound size={15} /> : <Truck size={15} />}
                  <span>{invoice?.service_type === 'rental' ? 'Jasa Penyewaan' : 'Jasa Pengiriman'}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">Jenis jasa tidak dapat diedit. Jika salah pilih, void invoice lalu buat invoice baru.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Jatuh Tempo *</label>
                <input type="date" className="form-input w-full disabled:bg-gray-50 disabled:text-gray-500" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={!fullEditable} />
                {isDueDatePast && <p className="text-xs text-amber-600 mt-1">⚠ Tanggal jatuh tempo sudah terlewat</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Catatan ke Customer</label>
                <textarea className="form-input w-full text-sm disabled:bg-gray-50 disabled:text-gray-500" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan..." disabled={!fullEditable} />
              </div>
            </div>
          </div>

          {/* Items */}
          {fullEditable && <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Rincian Item</h2>
              <button onClick={addItem} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
                <Plus size={14} />
                Tambah Item
              </button>
            </div>
            {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}
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
                    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) reorderItems(dragFrom, dragOver)
                    setDragFrom(null); setDragOver(null)
                  }}
                  serviceType={invoice?.service_type ?? 'delivery'}
                />
              ))}
            </div>
            <button onClick={addItem} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
              <Plus size={16} />Tambah Item
            </button>
          </div>}

          {/* Tax */}
          {fullEditable && <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-4">Kalkulasi Pajak</h2>
            <InvoiceTaxCalculator
              subtotal={subtotalAmount}
              taxPercent={taxPercent}
              taxEnabled={taxEnabled}
              pphPercent={pphPercent}
              pphEnabled={pphEnabled}
              isPkp={invoice?.customer.is_pkp}
              onToggleTax={e => { setTaxEnabled(e); setTaxPercent(e ? 1.1 : 0) }}
              onChangeTaxPercent={setTaxPercent}
              onTogglePph={e => { setPphEnabled(e); if (e && pphPercent === 0) setPphPercent(2) }}
              onChangePphPercent={setPphPercent}
              insuranceEnabled={insuranceEnabled}
              insuranceAmount={insuranceAmount}
              onToggleInsurance={toggleInsurance}
              onChangeInsuranceAmount={setInsuranceAmount}
            />
          </div>}

          {/* Metode Pembayaran — hanya bisa diedit saat draft */}
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
                  onClick={() => fullEditable && setPaymentMethod(opt.value)}
                  disabled={!fullEditable}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === opt.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'transfer' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Rekening Tujuan {fullEditable && <span className="text-red-500">*</span>}
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                          fullEditable ? 'cursor-pointer' : 'cursor-default opacity-75'
                        } ${
                          bankAccountId === bank.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bank_account_edit"
                          checked={bankAccountId === bank.id}
                          onChange={() => fullEditable && setBankAccountId(bank.id)}
                          disabled={!fullEditable}
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
              </div>
            )}
          </div>

          {/* Down Payment (Uang Muka) — bisa diedit di semua status non-void */}
          <DownPaymentForm
            totalAmount={fullEditable ? nettoAmount : (invoice?.total_amount ?? 0)}
            initialValue={downPayment}
            onChange={setDownPayment}
            defaultDate={invoice?.invoice_date}
            paymentMethod={paymentMethod}
          />
          {errors.down_payment && <p className="text-xs text-red-500 -mt-2">{errors.down_payment}</p>}

          {/* Lampiran */}
          {fullEditable && <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="text-base font-semibold mb-1">Lampiran Dokumen</h2>
            <p className="text-xs text-gray-500 mb-4">Upload foto atau file PDF sebagai dokumen pendukung invoice ini.</p>
            <InvoiceLampiranUploadZone
              value={lampiranPaths}
              onChange={setLampiranPaths}
              invoiceUuid={uuid}
            />
          </div>}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border p-5 sticky top-20" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Ringkasan</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Sub Total</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(subtotalAmount)}</span></div>
              {taxEnabled && <div className="flex justify-between"><span className="text-gray-500">PPN {taxPercent}%</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>+ {formatRupiah(taxAmount)}</span></div>}
              {pphEnabled && <div className="flex justify-between"><span className="text-gray-500">PPh {pphPercent}%</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#DC2626' }}>− {formatRupiah(pphAmount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
                <span>NETTO</span>
                <span className="font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>{formatRupiah(nettoAmount)}</span>
              </div>
              {downPayment && downPayment.amount > 0 && (
                <>
                  <div className="flex justify-between text-green-700 border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
                    <span>DP Diterima</span>
                    <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>− {formatRupiah(downPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Sisa Tagihan</span>
                    <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(Math.max(0, (fullEditable ? nettoAmount : (invoice?.total_amount ?? 0)) - downPayment.amount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--border-card)' }}>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
          Simpan Perubahan
        </button>
      </div>
      <div className="h-20" />
    </DashboardLayout>
  )
}
