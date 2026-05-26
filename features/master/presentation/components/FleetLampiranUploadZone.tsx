'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImageIcon, Trash2, Upload } from 'lucide-react'

export interface PendingFleetLampiran {
  id: string
  file: File
  preview: string
}

interface ExistingLampiran {
  path: string
  name: string
}

interface Props {
  existingPaths: string[]
  pendingFiles: PendingFleetLampiran[]
  onExistingChange: (paths: string[]) => void
  onPendingChange: (files: PendingFleetLampiran[]) => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILES = 3
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function toExisting(path: string): ExistingLampiran {
  return { path, name: path.split('/').pop() ?? path }
}

function createId(file: File) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `${file.name}-${file.lastModified}-${random}`
}

export default function FleetLampiranUploadZone({
  existingPaths,
  pendingFiles,
  onExistingChange,
  onPendingChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [existing, setExisting] = useState<ExistingLampiran[]>(() => existingPaths.map(toExisting))
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const totalFiles = existing.length + pendingFiles.length
  const isFull = totalFiles >= MAX_FILES

  useEffect(() => {
    setExisting(existingPaths.map(toExisting))
  }, [existingPaths])

  const handleFiles = (incoming: FileList | null) => {
    if (disabled) return
    if (!incoming) return
    setError(null)

    const remaining = MAX_FILES - totalFiles
    if (remaining <= 0) {
      setError(`Maksimal ${MAX_FILES} foto lampiran.`)
      return
    }

    const selected = Array.from(incoming).slice(0, remaining)
    const next: PendingFleetLampiran[] = []
    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Format tidak didukung. Gunakan JPG, PNG, atau WebP.')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" melebihi batas 5MB.`)
        return
      }
      next.push({
        id: createId(file),
        file,
        preview: URL.createObjectURL(file),
      })
    }

    if (next.length) onPendingChange([...pendingFiles, ...next])
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeExisting = (path: string) => {
    if (disabled) return
    const next = existingPaths.filter(item => item !== path)
    onExistingChange(next)
  }

  const removePending = (id: string) => {
    if (disabled) return
    const target = pendingFiles.find(item => item.id === id)
    if (target) URL.revokeObjectURL(target.preview)
    onPendingChange(pendingFiles.filter(item => item.id !== id))
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!isFull && !disabled && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
          style={{
            borderColor: isDragOver ? 'var(--green-primary)' : 'var(--border-card)',
            backgroundColor: isDragOver ? '#F0FDF4' : 'transparent',
          }}
        >
          <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
            <Upload size={18} />
          </div>
          <div className="text-sm font-medium mt-2">Drag & drop foto di sini</div>
          <div className="text-xs text-gray-500">atau klik untuk memilih</div>
          <div className="text-[11px] text-gray-400 mt-1">JPG, PNG, WebP · Maks. 5MB · Sisa {MAX_FILES - totalFiles} slot</div>
        </div>
      )}

      {isFull && (
        <div className="rounded-xl border-2 border-dashed p-4 text-center text-xs text-gray-400" style={{ borderColor: 'var(--border-card)' }}>
          Batas maksimal {MAX_FILES} foto tercapai. Hapus salah satu untuk menambah lagi.
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {totalFiles > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {existing.map((file, idx) => (
            <div key={file.path} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-card)', backgroundColor: '#FAFAFA' }}>
              <div className="h-20 rounded bg-blue-50 flex items-center justify-center">
                <ImageIcon size={22} className="text-blue-600" />
              </div>
              <div className="mt-2 text-[11px] font-medium truncate">{file.name}</div>
              <div className="text-[10px] text-gray-400">Foto {idx + 1}/{MAX_FILES}</div>
              {!disabled && (
                <button type="button" onClick={() => removeExisting(file.path)} className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                  <Trash2 size={12} />
                  Hapus
                </button>
              )}
            </div>
          ))}
          {pendingFiles.map((file, idx) => (
            <div key={file.id} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-card)', backgroundColor: '#FAFAFA' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.preview} alt={file.file.name} className="h-20 w-full rounded object-cover" />
              <div className="mt-2 text-[11px] font-medium truncate">{file.file.name}</div>
              <div className="text-[10px] text-gray-400">Foto {existing.length + idx + 1}/{MAX_FILES}</div>
              {!disabled && (
                <button type="button" onClick={() => removePending(file.id)} className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                  <Trash2 size={12} />
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
