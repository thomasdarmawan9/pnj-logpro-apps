'use client'

import { useRef, useState } from 'react'
import { Camera, Upload } from 'lucide-react'

interface SJPODUploadZoneProps {
  onUpload: (path: string) => void
  currentPhoto?: string | null
}

export default function SJPODUploadZone({ onUpload, currentPhoto }: SJPODUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentPhoto || null)
  const [progress, setProgress] = useState<number>(0)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
      setIsCompressing(true)
      setProgress(20)
      const steps = [40, 60, 80, 100]
      steps.forEach((value, idx) => {
        setTimeout(() => setProgress(value), 300 * (idx + 1))
      })
      setTimeout(() => {
        setIsCompressing(false)
        onUpload(`/mock/${file.name.replace(/\s+/g, '-').toLowerCase()}`)
      }, 1500)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition"
        style={{ borderColor: 'var(--border-card)' }}
      >
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
          {preview ? <Camera size={20} /> : <Upload size={20} />}
        </div>
        <div className="text-sm font-medium mt-3">Drag & drop foto di sini</div>
        <div className="text-xs text-gray-500">atau klik untuk memilih</div>
        <div className="text-[11px] text-gray-400 mt-2">JPG, PNG · Maks. 5MB</div>
      </div>

      {preview && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview Bukti Pengiriman" className="w-full max-h-56 object-cover rounded-xl" />
          {isCompressing && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-2">Mengompresi gambar...</div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Output: ~650KB WebP</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
