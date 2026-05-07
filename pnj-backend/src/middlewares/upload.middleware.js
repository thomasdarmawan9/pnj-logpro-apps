'use strict'

const multer = require('multer')
const sharp  = require('sharp')
const path   = require('path')
const fs     = require('fs')
const { v4: uuidv4 } = require('uuid')
const env    = require('../config/env')
const logger = require('../utils/logger')

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PDF_TYPES   = ['application/pdf']

// ── Multer: upload foto saja (POD photo, fleet photo) ─────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.'))
    }
  },
  limits: { fileSize: env.upload.maxFileSizeMB * 1024 * 1024 },
})

// ── Multer: upload lampiran (image atau PDF) ──────────────────────────────
const uploadLampiran = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if ([...IMAGE_TYPES, ...PDF_TYPES].includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau PDF.'))
    }
  },
  limits: { fileSize: env.upload.maxFileSizeMB * 1024 * 1024 },
})

/**
 * Middleware: kompres image ke webp + simpan ke uploads/{subDir}/.
 * Untuk POD / Fleet photo. PDF tidak masuk ke sini.
 */
function compressImage(subDir) {
  return async (req, res, next) => {
    try {
      if (!req.file) return next()

      const targetDir = path.resolve(env.upload.dir, subDir)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const filename    = `${uuidv4()}.webp`
      const outputPath  = path.join(targetDir, filename)

      await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: env.upload.compressQuality })
        .toFile(outputPath)

      req.file.savedPath = `${subDir}/${filename}`
      next()
    } catch (err) {
      logger.error('Gagal memproses gambar:', err)
      next(err)
    }
  }
}

/**
 * Middleware: simpan file lampiran (image dikompres webp, PDF disimpan apa
 * adanya). Output: req.file.savedPath = "<subDir>/<uuid>.<ext>" (relative).
 */
function processLampiran(subDir) {
  return async (req, res, next) => {
    try {
      if (!req.file) return next()

      const targetDir = path.resolve(env.upload.dir, subDir)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const isImage = IMAGE_TYPES.includes(req.file.mimetype)
      const ext     = isImage ? 'webp' : 'pdf'
      const id      = uuidv4()
      const filename   = `${id}.${ext}`
      const outputPath = path.join(targetDir, filename)

      if (isImage) {
        await sharp(req.file.buffer)
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: env.upload.compressQuality })
          .toFile(outputPath)
      } else {
        await fs.promises.writeFile(outputPath, req.file.buffer)
      }

      // Simpan original filename juga untuk content-disposition saat download.
      req.file.savedPath     = `${subDir}/${filename}`
      req.file.savedFilename = filename
      req.file.originalNameSafe = sanitizeOriginalName(req.file.originalname || `${id}.${ext}`)
      next()
    } catch (err) {
      logger.error('Gagal memproses lampiran:', err)
      next(err)
    }
  }
}

function sanitizeOriginalName(name) {
  return String(name)
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200)
}

module.exports = {
  upload,
  uploadLampiran,
  compressImage,
  processLampiran,
  sanitizeOriginalName,
  IMAGE_TYPES,
  PDF_TYPES,
}
