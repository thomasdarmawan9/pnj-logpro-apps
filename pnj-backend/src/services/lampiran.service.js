'use strict'

const fs   = require('fs')
const path = require('path')
const env  = require('../config/env')
const logger = require('../utils/logger')
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
} = require('../utils/AppError')

const MAX_LAMPIRAN_PER_RECORD = 3

/**
 * Resolve absolute path dari "subDir/filename" (relative thd UPLOAD_DIR).
 * Block path traversal.
 */
function resolveAbsolute(relativePath) {
  const baseDir = path.resolve(env.upload.dir)
  const abs     = path.resolve(baseDir, relativePath)

  if (!abs.startsWith(baseDir + path.sep) && abs !== baseDir) {
    throw new BadRequestError('Path tidak valid.')
  }
  return abs
}

/**
 * Hapus file lampiran dari disk. Diam-diam abaikan kalau tidak ada.
 */
function safeUnlink(relativePath) {
  if (!relativePath) return
  try {
    const abs = resolveAbsolute(relativePath)
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  } catch (err) {
    logger.warn(`[lampiran.service] gagal hapus file ${relativePath}: ${err.message}`)
  }
}

/**
 * Diff antara old & new lampiran_paths → array path yang dihapus.
 * Untuk dipanggil saat update SJ/Invoice supaya file orphan ke-cleanup.
 */
function diffRemoved(oldPaths, newPaths) {
  const oldArr = Array.isArray(oldPaths) ? oldPaths : []
  const newArr = Array.isArray(newPaths) ? newPaths : []
  const newSet = new Set(newArr)
  return oldArr.filter(p => !newSet.has(p))
}

/**
 * Append path ke array lampiran_paths existing dengan validasi limit.
 *  @returns array lampiran_paths baru
 */
function appendLampiranPath(existing, newPath) {
  const arr = Array.isArray(existing) ? [...existing] : []
  if (arr.length >= MAX_LAMPIRAN_PER_RECORD) {
    throw new ConflictError(
      `Maksimal ${MAX_LAMPIRAN_PER_RECORD} lampiran per dokumen. Hapus salah satu untuk menambah.`,
      { code: 'LAMPIRAN_LIMIT_REACHED' },
    )
  }
  arr.push(newPath)
  return arr
}

/**
 * Hapus path tertentu dari array lampiran_paths.
 * Throw NotFoundError kalau path tidak ada di list.
 * TIDAK memanggil safeUnlink — caller bertanggung jawab hapus file SETELAH
 * transaction commit supaya file tidak dihapus kalau DB rollback.
 *  @returns array lampiran_paths baru
 */
function removeLampiranPath(existing, targetPath) {
  const arr = Array.isArray(existing) ? existing : []
  const idx = arr.indexOf(targetPath)
  if (idx === -1) {
    throw new NotFoundError('Lampiran tidak ditemukan di dokumen ini.')
  }
  return arr.slice(0, idx).concat(arr.slice(idx + 1))
}

/**
 * Cleanup paths yang dihapus saat update lampiran_paths. Dipanggil DI DALAM
 * service update SJ/Invoice setelah commit transaction.
 */
function cleanupRemovedPaths(oldPaths, newPaths) {
  const removed = diffRemoved(oldPaths, newPaths)
  for (const p of removed) safeUnlink(p)
  return removed
}

/**
 * Validasi format path: harus berbentuk "<subDir>/<filename>" tanpa traversal.
 */
function isValidLampiranPath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 255) return false
  if (p.includes('..')) return false
  if (path.isAbsolute(p)) return false
  return true
}

module.exports = {
  MAX_LAMPIRAN_PER_RECORD,
  resolveAbsolute,
  safeUnlink,
  diffRemoved,
  cleanupRemovedPaths,
  appendLampiranPath,
  removeLampiranPath,
  isValidLampiranPath,
}
