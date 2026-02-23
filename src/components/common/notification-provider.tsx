'use client'

import { toast } from 'sonner'
import { useEventSource } from '@/lib/hooks/use-event-source'

const ANALYSIS_LABELS: Record<string, string> = {
  saju: '사주',
  mbti: 'MBTI',
  vark: 'VARK',
  face: '관상',
  palm: '수상',
  name: '이름풀이',
  zodiac: '별자리',
}

/**
 * SSE 이벤트를 수신하여 sonner toast로 알림을 표시하는 Provider
 */
export function NotificationProvider() {
  useEventSource({
    url: '/api/events',
    onMessage: (data) => {
      const event = data as { type: string; analysisType?: string; subjectName?: string; subjectType?: string }

      if (event.type === 'analysis:complete') {
        const label = ANALYSIS_LABELS[event.analysisType ?? ''] ?? event.analysisType
        const subjectLabel = event.subjectType === 'TEACHER' ? '선생님' : '학생'
        toast.success(`${event.subjectName} ${subjectLabel}의 ${label} 분석이 완료되었습니다.`)
      }
    },
  })

  return null
}
