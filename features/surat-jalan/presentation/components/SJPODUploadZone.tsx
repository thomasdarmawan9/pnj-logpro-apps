'use client'

import { useRef, useState } from 'react'
import { Camera, AlertCircle, RefreshCw } from 'lucide-react'

interface SJPODUploadZoneProps {
  onUpload: (path: string) => void
  currentPhoto?: string | null
  uploadFile?: (file: File) => Promise<string>
}

const MAX_SIZE = 5 * 1024 * 1024  // 5MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })
}

export default function SJPODUploadZone({ onUpload, currentPhoto, uploadFile }: SJPODUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    setUploaded(false)

    // Validasi
    if (!ACCEPTED.includes(file.type)) {
      setError('Format tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError(`Ukuran file melebihi 5MB.`)
      return
    }

    // Tampilkan preview dari lokal dulu
    try {
      const dataUrl = await readAsDataURL(file)
      setPreview(dataUrl)
    } catch {
      setError('Gagal membaca file gambar.')
      return
    }

    // Upload ke server
    setIsUploading(true)
    try {
      const path = uploadFile
        ? await uploadFile(file)
        : `/mock/${file.name.replace(/\s+/g, '-').toLowerCase()}`

      if (!path) {
        throw new Error('Server tidak mengembalikan path foto. Coba lagi.')
      }
      onUpload(path)
      setUploaded(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengupload foto.'
      setError(`Upload gagal: ${msg}`)
      setPreview(null)
      onUpload('')
    } finally {
      setIsUploading(false)
      // Reset input supaya file yang sama bisa dipilih ulang
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // Foto yang ditampilkan: preview upload baru > currentPhoto dari server
  const displaySrc = preview || currentPhoto || null

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {/* Drop zone / preview area */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file && !isUploading) handleFile(file)
        }}
        className="border-2 border-dashed rounded-xl overflow-hidden transition cursor-pointer"
        style={{
          borderColor: error ? '#FCA5A5' : uploaded || isDragOver ? 'var(--green-primary)' : 'var(--border-card)',
          backgroundColor: isDragOver ? '#F0FDF4' : 'transparent',
          cursor: isUploading ? 'not-allowed' : 'pointer',
        }}
      >
        {displaySrc ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt="Preview Bukti Pengiriman"
              className="w-full max-h-56 object-cover"
            />
            {/* Overlay ganti foto */}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center group">
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 bg-white/90 rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                  <RefreshCw size={14} />
                  Ganti Foto
                </div>
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-white/90 rounded-lg px-4 py-2 text-sm font-medium text-gray-700">
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Mengunggah...
                </div>
              </div>
            )}
            {uploaded && (
              <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                ✓ Terupload
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
              {isUploading
                ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <Camera size={20} className="text-gray-500" />
              }
            </div>
            <div className="text-sm font-medium mt-3 text-gray-700">
              {isUploading ? 'Mengunggah foto...' : 'Klik atau drag foto di sini'}
            </div>
            <div className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Maks. 5MB</div>
          </div>
        )}
      </div>

      {/* Pesan error */}
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Hint ganti foto jika currentPhoto ada tapi belum upload baru */}
      {currentPhoto && !preview && !error && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Foto saat ini ditampilkan. Klik untuk mengganti dengan foto baru.
        </p>
      )}
    </div>
  )
}
