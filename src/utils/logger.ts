/**
 * Simple logging utility for VestyWinBox
 * Provides structured logging with different levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  data?: any
  source?: string
}

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO
  private logs: LogEntry[] = []
  private maxLogs = 1000

  setLevel(level: LogLevel): void {
    this.currentLevel = level
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level < this.currentLevel) return

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      source,
    }

    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      const prefix = `[${entry.timestamp.toISOString()}] ${source ? `[${source}]` : ''}`

      switch (level) {
        case LogLevel.DEBUG:
          // eslint-disable-next-line no-console
          console.debug(prefix, message, data || '')
          break
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.info(prefix, message, data || '')
          break
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(prefix, message, data || '')
          break
        case LogLevel.ERROR:
          // eslint-disable-next-line no-console
          console.error(prefix, message, data || '')
          break
      }
    }
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source)
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source)
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source)
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source)
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter((log) => log.level >= level)
    }
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  exportLogs(): string {
    return this.logs
      .map((log) => {
        const levelName = LogLevel[log.level]
        const data = log.data ? ` | ${JSON.stringify(log.data)}` : ''
        const source = log.source ? ` [${log.source}]` : ''
        return `${log.timestamp.toISOString()} ${levelName}${source}: ${log.message}${data}`
      })
      .join('\n')
  }
}

// Create a singleton instance
export const logger = new Logger()

// Set debug level in development
if (import.meta.env.DEV) {
  logger.setLevel(LogLevel.DEBUG)
}

// Convenience exports for common usage
export const log = {
  debug: (message: string, data?: any, source?: string) => logger.debug(message, data, source),
  info: (message: string, data?: any, source?: string) => logger.info(message, data, source),
  warn: (message: string, data?: any, source?: string) => logger.warn(message, data, source),
  error: (message: string, data?: any, source?: string) => logger.error(message, data, source),
}

export default logger
