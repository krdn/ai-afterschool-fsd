import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

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

interface StatusCardProps {
  title: string
  status: HealthCheckItem
  testId?: string
}

export function StatusCard({ title, status, testId }: StatusCardProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'unknown':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200'
      case 'unhealthy':
        return 'bg-red-50 border-red-200'
      case 'unknown':
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  return (
    <Card
      className={getStatusColor()}
      data-testid={testId || `status-${title.toLowerCase()}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {getStatusIcon()}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 mb-2" data-testid={`${testId}-message`}>
          {status.message || '상태 확인 중...'}
        </p>
        {status.responseTime !== undefined && (
          <p className="text-xs text-gray-500" data-testid={`${testId}-response-time`}>
            응답 시간: {status.responseTime}ms
          </p>
        )}
        {status.connectionPool && (
          <div className="mt-2 text-xs text-gray-500" data-testid={`${testId}-connection-pool`}>
            <span>연결 풀: {status.connectionPool.total}개</span>
            <span className="ml-2">유휴: {status.connectionPool.idle}개</span>
            {status.connectionPool.waiting > 0 && (
              <span className="ml-2 text-yellow-600">대기: {status.connectionPool.waiting}개</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
