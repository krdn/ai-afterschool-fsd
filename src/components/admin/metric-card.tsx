import { Card, CardContent } from '@/components/ui/card'
import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  testId?: string
}

export function MetricCard({ label, value, icon, testId }: MetricCardProps) {
  return (
    <Card data-testid={testId || `metric-${label.toLowerCase()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500" data-testid={`${testId}-label`}>
            {label}
          </p>
          {icon && <div data-testid={`${testId}-icon`}>{icon}</div>}
        </div>
        <p className="text-2xl font-bold" data-testid={`${testId}-value`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
