import { config } from './config/index.js'
import logger from './logger/index.js'
import app from './app.js'
import { closeBrowser } from './reports/user-activity-report.js'
import { cleanupOldFiles } from './services/fileManager.js'
import { mkdir } from 'node:fs/promises'

// Ensure temp directory exists
await mkdir(config.TEMP_DIR, { recursive: true })

const PORT = config.PORT

const server = app.listen(PORT, () => {
  logger.info(`🚀 Report Platform server running on http://localhost:${PORT}`)
  logger.info(`📋 Health check: http://localhost:${PORT}/api/health`)
  logger.info(`🌍 Environment: ${config.NODE_ENV}`)
})

// Periodic file cleanup (every 2 hours)
const cleanupInterval = setInterval(
  () => {
    cleanupOldFiles().catch((err) => logger.error({ err }, 'File cleanup failed'))
  },
  2 * 60 * 60 * 1000,
)

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, closing gracefully…')

  clearInterval(cleanupInterval)
  await closeBrowser()

  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('Forceful shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
