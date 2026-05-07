'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, ImageIcon, Paperclip, Trash2, Upload, AlertCircle } from 'lucide-react'
import { uploadSuratJalanLampiran, deleteSuratJalanLampiran } from '../../infrastructure/repositories/MockSuratJalanRepository'

interface LampiranFile {
  name: string
  type: 'image' | 'pdf'
  preview: string | null
  path: string
}

interface SJLampiranUploadZoneProps {
  value: string[]
  onChange: (paths: string[]) => void
  sjUuid?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILES = 3
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function getFileType(file: File): 'image' | 'pdf' {
  return file.type === 'application/pdf' ? 'pdf' : 'image'
}

function generateLocalPath(file: File): string {
  return `/pending/${file.name.replace(/\s+/g, '-').toLowerCase()}`
}

function toEntry(path: string): LampiranFile {
  return {
    name: path.split('/').pop() ?? path,
    type: path.endsWith('.pdf') ? 'pdf' : 'image',
    preview: null,
    path,
  }
}

export default function SJLampiranUploadZone({ value, onChange, sjUuid }: SJLampiranUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<LampiranFile[]>(() => value.map(toEntry))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const isFull = files.length >= MAX_FILES

  useEffect(() => {
    setFiles(value.map(toEntry))
  }, [value])

  const handleFiles = async (incoming: FileList | null) => {
    if (!incoming || uploading) return
    setError(null)

    const remaining = MAX_FILES - files.length
    if (remaining <= 0) {
      setError(`Maksimal ${MAX_FILES} dokumen lampiran.`)
      return
    }

    const valid: File[] = []
    for (const file of Array.from(incoming).slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Format tidak didukung. Gunakan JPG, PNG, atau PDF.')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" melebihi batas 5MB.`)
        return
      }
      valid.push(file)
    }
    if (!valid.length) return

    setUploading(true)

    if (sjUuid) {
      try {
        let latestPaths = files.map(file => file.path)
        for (const file of valid) {
          const updatedSJ = await uploadSuratJalanLampiran(sjUuid, file)
          latestPaths = updatedSJ.lampiran_paths ?? []
        }
        onChange(latestPaths)
        setFiles(latestPaths.map(toEntry))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mengunggah file.'
        setError(`Upload gagal: ${msg}`)
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
      return
    }

    const newEntries: LampiranFile[] = []
    for (const file of valid) {
      const fileType = getFileType(file)
      const preview = fileType === 'image'
        ? await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        : null
      newEntries.push({ name: file.name, type: fileType, preview, path: generateLocalPath(file) })
    }
    setFiles(prev => {
      const updated = [...prev, ...newEntries]
      onChange(updated.map(f => f.path))
      return updated
    })
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = async (index: number) => {
    const target = files[index]
    setError(null)

    if (sjUuid && target) {
      try {
        const updatedSJ = await deleteSuratJalanLampiran(sjUuid, target.path)
        const paths = updatedSJ.lampiran_paths ?? []
        setFiles(paths.map(toEntry))
        onChange(paths)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menghapus lampiran.'
        setError(`Hapus gagal: ${msg}`)
      }
      return
    }

    setFiles(prev => {
      const updated = prev.filter((_, i) => i !== index)
      onChange(updated.map(f => f.path))
      return updated
    })
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!isFull && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
          style={{
            borderColor: isDragOver ? 'var(--green-primary)' : 'var(--border-card)',
            backgroundColor: isDragOver ? '#F0FDF4' : 'transparent',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
            {uploading
              ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <Upload size={18} />
            }
          </div>
          <div className="text-sm font-medium mt-2">{uploading ? 'Mengunggah...' : 'Drag & drop file di sini'}</div>
          <div className="text-xs text-gray-500">atau klik untuk memilih</div>
          <div className="text-[11px] text-gray-400 mt-1">
            <span className="inline-flex items-center gap-1"><ImageIcon size={10} /> JPG, PNG</span>
            &nbsp;·&nbsp;
            <span className="inline-flex items-center gap-1"><FileText size={10} /> PDF</span>
            &nbsp;· Maks. 5MB · Sisa {MAX_FILES - files.length} slot
          </div>
        </div>
      )}

      {isFull && (
        <div className="rounded-xl border-2 border-dashed p-4 text-center text-xs text-gray-400" style={{ borderColor: 'var(--border-card)' }}>
          Batas maksimal {MAX_FILES} dokumen tercapai. Hapus salah satu untuk menambah lagi.
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--border-card)', backgroundColor: '#FAFAFA' }}
            >
              {file.type === 'image' && file.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.preview} alt={file.name} className="w-10 h-10 rounded object-cover shrink-0" />
              ) : (
                <div
                  className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: file.type === 'pdf' ? '#FEF2F2' : '#EFF6FF' }}
                >
                  {file.type === 'pdf'
                    ? <FileText size={18} style={{ color: '#DC2626' }} />
                    : <ImageIcon size={18} style={{ color: '#3B82F6' }} />
                  }
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{file.name}</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Paperclip size={9} />
                  {file.type === 'pdf' ? 'PDF' : 'Gambar'} · Dokumen {idx + 1}/{MAX_FILES}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                disabled={uploading}
                className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Hapus lampiran"
              >
                <Trash2 size={14} style={{ color: '#EF4444' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
