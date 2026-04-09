import pino from 'pino'
import { config } from '../config/index.js'

export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.LOG_PRETTY && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }),
})

export default logger
