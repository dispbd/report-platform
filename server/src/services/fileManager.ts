import { readdir, unlink, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from '../config/index.js'
import logger from '../logger/index.js'

/**
 * Delete generated files older than FILE_CLEANUP_HOURS.
 */
export async function cleanupOldFiles(): Promise<number> {
  const dir = config.TEMP_DIR
  const maxAge = config.FILE_CLEANUP_HOURS * 60 * 60 * 1000

  let deleted = 0

  try {
    const files = await readdir(dir)
    const now = Date.now()

    for (const file of files) {
      const filePath = join(dir, file)

      try {
        const stats = await stat(filePath)
        if (now - stats.mtimeMs > maxAge) {
          await unlink(filePath)
          deleted++
        }
      } catch {
        // Skip files that can't be accessed
      }
    }

    if (deleted > 0) {
      logger.info({ deleted }, 'Cleaned up old report files')
    }
  } catch {
    // temp dir may not exist yet — that's fine
  }

  return deleted
}
