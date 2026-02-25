'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type WizardStep = 1 | 2 | 3 | 4

interface WizardStepperProps {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
}

const STEPS = [
  { step: 1 as const, label: '예약 정보' },
  { step: 2 as const, label: '학생 인사이트' },
  { step: 3 as const, label: '상담 시나리오' },
  { step: 4 as const, label: '학부모 공유' },
]

export function WizardStepper({ currentStep, completedSteps }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map(({ step, label }, index) => {
        const isCompleted = completedSteps.has(step)
        const isCurrent = currentStep === step
        const isLast = index === STEPS.length - 1

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && !isCompleted && 'border-primary text-primary bg-primary/10',
                  !isCurrent && !isCompleted && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 whitespace-nowrap',
                  isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mt-[-1rem]',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
