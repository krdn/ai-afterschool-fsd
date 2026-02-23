import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GraduationCap, type LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon?: LucideIcon
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  tips?: string[]
}

export function EmptyState({
  icon: Icon = GraduationCap,
  title = '아직 등록된 학생이 없어요',
  description = '학생을 등록하고 학습 관리를 시작해보세요. 학생 정보와 분석 결과를 한눈에 확인할 수 있어요.',
  actionLabel = '첫 학생 등록하기',
  actionHref = '/students/new',
  tips,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-16 w-16 text-gray-400" />
      </div>

      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        {title}
      </h2>
      <p className="mb-4 max-w-sm text-gray-500">
        {description}
      </p>

      {tips && tips.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 text-left max-w-sm">
          <p className="text-sm font-medium text-blue-800 mb-2">시작하기 팁:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button asChild size="lg">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  )
}
