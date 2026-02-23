import type { Prisma } from '@/lib/db'
import { GitBranch, Tag, RefreshCw, UserPlus, CheckCircle, Plus } from 'lucide-react'

interface TimelineEvent {
  id: string
  eventType: string
  metadata: Prisma.JsonValue
  createdAt: string | Date
  performer: { name: string }
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: Plus, label: '이슈 생성', color: 'text-blue-500' },
  labeled: { icon: Tag, label: '라벨 추가', color: 'text-purple-500' },
  branch_created: { icon: GitBranch, label: '브랜치 생성', color: 'text-green-500' },
  status_changed: { icon: RefreshCw, label: '상태 변경', color: 'text-yellow-500' },
  assigned: { icon: UserPlus, label: '담당자 변경', color: 'text-indigo-500' },
  closed: { icon: CheckCircle, label: '이슈 종료', color: 'text-gray-500' },
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEventDetail(event: TimelineEvent): string | null {
  const meta = event.metadata as Record<string, string> | null
  if (!meta) return null

  switch (event.eventType) {
    case 'status_changed':
      return `${meta.from} → ${meta.to}`
    case 'branch_created':
      return meta.branchName || null
    case 'labeled':
      return Array.isArray(meta.labels) ? meta.labels.join(', ') : null
    case 'assigned':
      return meta.to ? '담당자 할당됨' : '담당자 해제됨'
    default:
      return null
  }
}

export function IssueTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-gray-400 text-sm">이벤트 기록이 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">활동 기록</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {events.map((event) => {
            const config = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.created
            const Icon = config.icon
            const detail = getEventDetail(event)

            return (
              <div key={event.id} className="relative flex items-start gap-3 pl-2">
                <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center ${config.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{event.performer.name}</span>
                    <span className="text-gray-500 ml-1">{config.label}</span>
                  </p>
                  {detail && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{detail}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
