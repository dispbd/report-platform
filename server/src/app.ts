import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import logger from './logger/index.js'
import { config } from './config/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'
import reportsRouter from './routes/reports.js'
import runsRouter from './routes/runs.js'

const app = express()

// --- Security & parsing ---
app.use(helmet())
app.use(
  cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

// --- Request logging ---
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/api/health',
    },
  }),
)

// --- Routes ---
app.use('/api/health', healthRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/runs', runsRouter)

// --- Error handling ---
app.use(errorHandler)

export default app
