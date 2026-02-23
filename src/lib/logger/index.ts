import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Log level configuration
const defaultLevel = isDevelopment ? 'debug' : 'info'
const logLevel = process.env.LOG_LEVEL || defaultLevel

// Sensitive data paths to redact from logs
const redactPaths = [
  'password',
  'token',
  'apiKey',
  '*.password',
  '*.token',
  '*.apiKey',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
]

// Logger configuration
const loggerOptions: pino.LoggerOptions = {
  level: logLevel,
  // Disable logging in test environment
  enabled: !isTest,
  // Redact sensitive data
  redact: {
    paths: redactPaths,
    remove: true,
  },
  // Base fields included in all logs
  base: {
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.1.0',
  },
}

// Add pretty printing for development
if (isDevelopment) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname,env,version',
      translateTime: 'SYS:standard',
      messageFormat: '{msg}',
    },
  }
}

// Create and export logger instance
export const logger = pino(loggerOptions)
