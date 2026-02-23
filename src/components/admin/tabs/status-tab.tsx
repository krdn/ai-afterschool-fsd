import { StatusCard } from '@/components/admin/status-card'
import { MetricCard } from '@/components/admin/metric-card'
import { Clock } from 'lucide-react'

interface HealthCheckItem {
  status: 'healthy' | 'unhealthy' | 'unknown'
  message?: string
  responseTime?: number
  connectionPool?: {
    total: number
    idle: number
    waiting: number
  }
}

interface StatusTabProps {
  healthData: {
    status: string
    uptime: number
    version?: string
    headers?: {
      'X-Response-Time'?: string
    }
    checks: {
      database: HealthCheckItem
      storage: HealthCheckItem
      backup?: HealthCheckItem
    }
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600))
  const hours = Math.floor((seconds % (24 * 3600)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}일 ${hours}시간 ${minutes}분`
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  } else {
    return `${minutes}분`
  }
}

export function StatusTab({ healthData }: StatusTabProps) {
  return (
    <div className="space-y-8" data-testid="status-tab">
      {/* 서비스 상태 카드 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">서비스 상태</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatusCard
            title="Database"
            status={healthData.checks.database}
            testId="database"
          />
          <StatusCard
            title="Storage"
            status={healthData.checks.storage}
            testId="storage"
          />
          {healthData.checks.backup && (
            <StatusCard
              title="Backup"
              status={healthData.checks.backup}
              testId="backup"
            />
          )}
        </div>
      </section>

      {/* 시스템 메트릭 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">시스템 메트릭</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="업타임"
            value={formatUptime(healthData.uptime)}
            icon={<Clock className="w-4 h-4" />}
            testId="uptime"
          />
          <MetricCard
            label="상태"
            value={healthData.status}
            testId="status"
          />
          {healthData.version && (
            <MetricCard
              label="버전"
              value={healthData.version}
              testId="version"
            />
          )}
          <MetricCard
            label="응답 시간"
            value={`${healthData.headers?.['X-Response-Time'] || '-'}ms`}
            testId="response-time"
          />
        </div>
      </section>
    </div>
  )
}
