'use client'

import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'

interface Props {
  open: boolean
  onClearAndSubmit: () => void
  onBack: () => void
}

export default function ClearManualSJPrompt({ open, onClearAndSubmit, onBack }: Props) {
  return (
    <ModalShell open={open} onClose={onBack} title="Batalkan Pembuatan SJ?" subtitle="Nomor SJ tidak jadi diproses">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Kamu membatalkan penimpaan SJ. Mau <strong>hapus nomor SJ manual</strong> dan lanjut membuat invoice
          <strong> tanpa SJ</strong>? Atau kembali ke form untuk mengganti nomornya.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onBack} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>
            Kembali ke Form
          </button>
          <button onClick={onClearAndSubmit} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
            Hapus Nomor & Buat Tanpa SJ
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
