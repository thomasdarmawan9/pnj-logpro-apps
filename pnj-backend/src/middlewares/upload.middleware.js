'use strict'

const multer = require('multer')
const sharp  = require('sharp')
const path   = require('path')
const fs     = require('fs')
const { v4: uuidv4 } = require('uuid')
const env    = require('../config/env')
const logger = require('../utils/logger')

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.'))
    }
  },
  limits: {
    fileSize: env.upload.maxFileSizeMB * 1024 * 1024,
  },
})

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

module.exports = { upload, compressImage }
