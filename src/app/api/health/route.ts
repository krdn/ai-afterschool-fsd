import { NextResponse } from 'next/server'
import { db, pool } from '@/lib/db/client'
import { existsSync, readdirSync, statSync } from 'fs'
import { logger } from '@/lib/logger'
import { join } from 'path'

/**
 * Health check response shape
 */
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  checks: {
    database: HealthCheckItem
    storage: HealthCheckItem
    backup?: HealthCheckItem
  }
  uptime: number
  version?: string
}

interface HealthCheckItem {
  status: 'healthy' | 'unhealthy' | 'unknown'
  message?: string
  responseTime?: number  // milliseconds
  connectionPool?: {
    total: number      // 전체 연결 수
    idle: number       // 유휴 연결 수
    waiting: number    // 대기 중인 요청 수
  }
}

/**
 * GET /api/health
 *
 * Health check endpoint for:
 * - Docker container health checks
 * - Load balancer health checks
 * - Deployment readiness probes
 * - Monitoring and alerting
 *
 * Returns 200 if all checks pass, 503 if any check fails
 */
export async function GET() {
  const startTime = Date.now()
  const results: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' },
      storage: { status: 'unknown' },
    },
    uptime: process.uptime(),
  }

  // Optional: Add version from package.json
  try {
    const packagePath = process.cwd() + '/package.json'
    const pkg = await import(packagePath)
    results.version = pkg.version
  } catch {
    // Version is optional
  }

  // 1. Database health check
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    const dbTime = Date.now() - dbStart

    // 연결 풀 메트릭 수집
    const connectionPoolMetrics = pool ? {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    } : { total: 0, idle: 0, waiting: 0 }

    // 연결 풀 사용률 계산 및 경고 (max: 10)
    const poolUsage = pool ? pool.totalCount / 10 : 0
    if (poolUsage > 0.8) {
      logger.warn({ poolUsage: `${(poolUsage * 100).toFixed(0)}%`, pool: connectionPoolMetrics }, 'Connection pool usage high')
    }

    results.checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: dbTime,
      connectionPool: connectionPoolMetrics,
    }

    // Warn if slow response
    if (dbTime > 1000) {
      results.checks.database.message += ` (slow: ${dbTime}ms)`
      results.status = 'degraded'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Database connection failed'
    results.checks.database = {
      status: 'unhealthy',
      message: errorMessage,
      connectionPool: pool ? {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      } : { total: 0, idle: 0, waiting: 0 },
    }
    results.status = 'unhealthy'
  }

  // 2. Storage health check
  try {
    const storageStart = Date.now()
    const storageType = process.env.PDF_STORAGE_TYPE || 'local'

    if (storageType === 's3') {
      // For S3/MinIO, check if configuration exists
      const minioEndpoint = process.env.MINIO_ENDPOINT
      const minioAccessKey = process.env.MINIO_ACCESS_KEY
      const minioSecretKey = process.env.MINIO_SECRET_KEY

      if (minioEndpoint && minioAccessKey && minioSecretKey) {
        const storageTime = Date.now() - storageStart
        results.checks.storage = {
          status: 'healthy',
          message: `S3 storage configured (${minioEndpoint})`,
          responseTime: storageTime,
        }

        if (storageTime > 1000) {
          results.checks.storage.message += ` (slow: ${storageTime}ms)`
          if (results.status !== 'unhealthy') {
            results.status = 'degraded'
          }
        }
      } else {
        results.checks.storage = {
          status: 'unhealthy',
          message: 'S3 storage incomplete configuration',
        }
        results.status = 'unhealthy'
      }
    } else {
      // For local storage, check if directory exists
      const storagePath = process.env.PDF_STORAGE_PATH || './public/reports'
      const pathExists = existsSync(storagePath)

      if (pathExists) {
        const storageTime = Date.now() - storageStart
        results.checks.storage = {
          status: 'healthy',
          message: `Local storage accessible (${storagePath})`,
          responseTime: storageTime,
        }

        if (storageTime > 1000) {
          results.checks.storage.message += ` (slow: ${storageTime}ms)`
          if (results.status !== 'unhealthy') {
            results.status = 'degraded'
          }
        }
      } else {
        results.checks.storage = {
          status: 'unhealthy',
          message: `Storage directory not found: ${storagePath}`,
        }
        results.status = 'unhealthy'
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Storage check failed'
    results.checks.storage = {
      status: 'unhealthy',
      message: errorMessage,
    }
    results.status = 'unhealthy'
  }

  // 3. Backup health check (optional)
  try {
    const backupStart = Date.now()
    const backupDir = process.env.BACKUP_DIR || './backups'
    const dbName = process.env.POSTGRES_DB || 'ai_afterschool'

    // Check if backup directory exists
    if (existsSync(backupDir)) {
      // Find backup files for this database
      const files = readdirSync(backupDir)
        .filter(f => f.startsWith(`${dbName}-`) && f.endsWith('.sql.gz'))

      if (files.length > 0) {
        // Get the most recent backup
        const latestFile = files
          .map(f => ({
            name: f,
            mtime: statSync(join(backupDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.mtime - a.mtime)[0]

        const latestPath = join(backupDir, latestFile.name)
        const backupAge = Date.now() - latestFile.mtime
        const backupSize = statSync(latestPath).size
        const backupTime = Date.now() - backupStart

        // Check if backup is recent (within 48 hours)
        const hoursSinceBackup = backupAge / (1000 * 60 * 60)
        if (hoursSinceBackup <= 48) {
          results.checks.backup = {
            status: 'healthy',
            message: `Last backup: ${latestFile.name} (${hoursSinceBackup.toFixed(1)}h ago, ${(backupSize / 1024).toFixed(1)}KB)`,
            responseTime: backupTime,
          }
        } else {
          results.checks.backup = {
            status: 'unhealthy',
            message: `No recent backup (last: ${hoursSinceBackup.toFixed(0)}h ago)`,
            responseTime: backupTime,
          }
          if (results.status !== 'unhealthy') {
            results.status = 'degraded'
          }
        }
      } else {
        results.checks.backup = {
          status: 'unhealthy',
          message: 'No backup files found',
        }
        if (results.status !== 'unhealthy') {
          results.status = 'degraded'
        }
      }
    } else {
      // Backup directory doesn't exist - warn but don't fail
      results.checks.backup = {
        status: 'healthy',
        message: 'Backup directory not configured',
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Backup check failed'
    results.checks.backup = {
      status: 'unknown',
      message: errorMessage,
    }
  }

  // 4. Calculate total response time
  const totalTime = Date.now() - startTime

  // 5. Return appropriate status code
  const statusCode = results.status === 'healthy' ? 200 : 503

  return NextResponse.json(results, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${totalTime}`,
    },
  })
}

/**
 * HEAD /api/health
 *
 * Lightweight health check for load balancers that only need status code
 */
export async function HEAD() {
  try {
    // Quick database check only
    await db.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
