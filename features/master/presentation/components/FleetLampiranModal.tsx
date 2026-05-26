'use client'

import { useEffect, useState } from 'react'
import { ImageIcon, X } from 'lucide-react'

interface Props {
  open: boolean
  title?: string
  subtitle?: string
  recordUuid: string | null
  paths: string[]
  downloadLampiran: (uuid: string, filePath: string) => Promise<Blob>
  onClose: () => void
}

interface PreviewItem {
  path: string
  name: string
  url: string | null
}

export default function FleetLampiranModal({
  open,
  title = 'Lampiran',
  subtitle,
  recordUuid,
  paths,
  downloadLampiran,
  onClose,
}: Props) {
  const [items, setItems] = useState<PreviewItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fullscreenItem, setFullscreenItem] = useState<PreviewItem | null>(null)

  useEffect(() => {
    if (!open || !recordUuid) {
      setItems([])
      setFullscreenItem(null)
      return
    }

    let active = true
    const urls: string[] = []
    setLoading(true)

    Promise.all(paths.map(async path => {
      try {
        const blob = await downloadLampiran(recordUuid, path)
        const url = URL.createObjectURL(blob)
        urls.push(url)
        return { path, name: path.split('/').pop() ?? path, url }
      } catch {
        return { path, name: path.split('/').pop() ?? path, url: null }
      }
    })).then(result => {
      if (active) setItems(result)
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [downloadLampiran, open, paths, recordUuid])

  if (!open || !recordUuid) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl animate-modalEnter overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-500">Tidak ada lampiran.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {items.map((item, idx) => (
                <div key={item.path} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                  {item.url ? (
                    <button
                      type="button"
                      onClick={() => setFullscreenItem(item)}
                      className="block h-48 w-full bg-gray-50"
                      title="Lihat fullscreen"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={`Lampiran armada ${idx + 1}`} className="h-48 w-full object-cover" />
                    </button>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-blue-50">
                      <ImageIcon size={28} className="text-blue-600" />
                    </div>
                  )}
                  <div className="px-3 py-2 text-xs font-medium truncate">{item.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {fullscreenItem?.url && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setFullscreenItem(null)}>
          <button
            type="button"
            onClick={() => setFullscreenItem(null)}
            className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Tutup"
          >
            <X size={22} className="text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenItem.url}
            alt={fullscreenItem.name}
            className="max-h-[92vh] max-w-[92vw] object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
