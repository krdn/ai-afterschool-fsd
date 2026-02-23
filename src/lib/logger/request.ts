import { v4 as uuidv4 } from 'uuid'
import type { NextRequest } from 'next/server'
import { logger } from './index'

/**
 * Request metadata extracted from NextRequest
 */
interface RequestMetadata {
  requestId: string
  method: string
  pathname: string
  ip?: string
  userAgent?: string
}

/**
 * Request-scoped logger with request ID and metadata
 * Created by createRequestLogger function
 */
export type RequestLogger = ReturnType<typeof createRequestLogger>

/**
 * Create a request-scoped logger with request ID and metadata
 *
 * @param req - Next.js request object
 * @returns Child logger instance with request context
 */
export function createRequestLogger(req: NextRequest) {
  // Extract or generate request ID
  const requestId = req.headers.get('x-request-id') || uuidv4()

  // Extract request metadata
  const metadata: RequestMetadata = {
    requestId,
    method: req.method,
    pathname: req.nextUrl.pathname,
  }

  // Extract IP from headers (for proxied requests)
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  metadata.ip = forwardedFor?.split(',')[0]?.trim() || realIp || undefined

  // Extract user agent (truncated to avoid huge logs)
  const userAgent = req.headers.get('user-agent')
  metadata.userAgent = userAgent ? userAgent.slice(0, 200) : undefined

  // Create child logger with request context
  return logger.child(metadata)
}
