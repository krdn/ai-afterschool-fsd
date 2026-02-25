// src/components/counseling/wizard/reservation-wizard.tsx
'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { WizardStepper, type WizardStep } from './wizard-stepper'
import { ReservationInfoStep } from './reservation-info-step'
import { StudentInsightStep } from './student-insight-step'
import { ScenarioStep } from './scenario-step'
import { ParentSummaryStep } from './parent-summary-step'
import { createReservationWithScenarioAction } from '@/lib/actions/counseling/reservation-with-scenario'

interface ReservationWizardProps {
  onCancel: () => void
  onSuccess: () => void
}

interface WizardState {
  // Step 1
  selectedDate?: Date
  selectedTime?: string
  selectedStudentId: string
  selectedParentId: string
  topic: string
  // Step 2
  analysisReport: string
  isReportApproved: boolean
  // Step 3
  scenario: string
  isScenarioApproved: boolean
  // Step 4
  parentSummary: string
  isParentSummaryApproved: boolean
  // 학생 정보 (Step 2에서 로드)
  studentName: string
}

export function ReservationWizard({ onCancel, onSuccess }: ReservationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [state, setState] = useState<WizardState>({
    selectedStudentId: '',
    selectedParentId: '',
    topic: '',
    analysisReport: '',
    isReportApproved: false,
    scenario: '',
    isScenarioApproved: false,
    parentSummary: '',
    isParentSummaryApproved: false,
    studentName: '',
  })

  // 스텝 완료 마킹 + 다음 스텝 이동
  const completeStep = useCallback((step: WizardStep) => {
    setCompletedSteps(prev => new Set([...prev, step]))
    if (step < 4) setCurrentStep((step + 1) as WizardStep)
  }, [])

  // 이전 스텝 (승인 상태 해제)
  const goBack = useCallback((step: WizardStep) => {
    if (step > 1) {
      setCurrentStep((step - 1) as WizardStep)
      // 이전으로 가면 이후 스텝 승인 해제
      setCompletedSteps(prev => {
        const next = new Set(prev)
        for (let s = step; s <= 4; s++) next.delete(s as WizardStep)
        return next
      })
      setState(prev => ({
        ...prev,
        ...(step >= 2 ? { isReportApproved: false } : {}),
        ...(step >= 3 ? { isScenarioApproved: false } : {}),
        ...(step >= 4 ? { isParentSummaryApproved: false } : {}),
      }))
    }
  }, [])

  // 최종 제출
  const handleSubmit = useCallback(async (skipAi = false) => {
    if (!state.selectedDate || !state.selectedTime) return
    setIsSubmitting(true)

    try {
      const [hours, minutes] = state.selectedTime.split(':').map(Number)
      const scheduledAt = new Date(state.selectedDate)
      scheduledAt.setHours(hours, minutes, 0, 0)

      const result = await createReservationWithScenarioAction({
        scheduledAt: scheduledAt.toISOString(),
        studentId: state.selectedStudentId,
        parentId: state.selectedParentId,
        topic: state.topic,
        ...(skipAi ? {} : {
          analysisReport: state.analysisReport || undefined,
          scenario: state.scenario || undefined,
          parentSummary: state.parentSummary || undefined,
        }),
      })

      if (result.success) {
        toast.success('예약이 등록되었습니다.')
        onSuccess()
      } else {
        toast.error(result.error || '예약 등록에 실패했습니다.')
        if (result.error?.includes('이미 예약')) {
          setCurrentStep(1)
        }
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }, [state, onSuccess])

  // AI 스킵 (Step 2에서 AI 없이 진행)
  const handleSkip = useCallback(() => {
    handleSubmit(true)
  }, [handleSubmit])

  return (
    <div className="space-y-6">
      <WizardStepper currentStep={currentStep} completedSteps={completedSteps} />

      {currentStep === 1 && (
        <ReservationInfoStep
          data={{
            selectedDate: state.selectedDate,
            selectedTime: state.selectedTime,
            selectedStudentId: state.selectedStudentId,
            selectedParentId: state.selectedParentId,
            topic: state.topic,
          }}
          onChange={(partial) => setState(prev => ({ ...prev, ...partial }))}
          onNext={() => completeStep(1)}
        />
      )}

      {currentStep === 2 && (
        <StudentInsightStep
          studentId={state.selectedStudentId}
          topic={state.topic}
          analysisReport={state.analysisReport}
          isReportApproved={state.isReportApproved}
          onReportChange={(report) => setState(prev => ({ ...prev, analysisReport: report }))}
          onReportApprove={() => {
            setState(prev => ({ ...prev, isReportApproved: true }))
            completeStep(2)
          }}
          onStudentNameLoaded={(name) => setState(prev => ({ ...prev, studentName: name }))}
          onSkip={handleSkip}
          onBack={() => goBack(2)}
          onNext={() => completeStep(2)}
        />
      )}

      {currentStep === 3 && (
        <ScenarioStep
          studentId={state.selectedStudentId}
          topic={state.topic}
          approvedReport={state.analysisReport}
          scenario={state.scenario}
          isScenarioApproved={state.isScenarioApproved}
          onScenarioChange={(scenario) => setState(prev => ({ ...prev, scenario }))}
          onScenarioApprove={() => {
            setState(prev => ({ ...prev, isScenarioApproved: true }))
            completeStep(3)
          }}
          onBack={() => goBack(3)}
          onNext={() => completeStep(3)}
        />
      )}

      {currentStep === 4 && (
        <ParentSummaryStep
          studentName={state.studentName}
          topic={state.topic}
          scheduledAt={state.selectedDate && state.selectedTime
            ? (() => {
                const d = new Date(state.selectedDate)
                return `${d.toLocaleDateString('ko-KR')} ${state.selectedTime}`
              })()
            : ''}
          approvedScenario={state.scenario}
          parentSummary={state.parentSummary}
          isParentSummaryApproved={state.isParentSummaryApproved}
          onParentSummaryChange={(summary) => setState(prev => ({ ...prev, parentSummary: summary }))}
          onParentSummaryApprove={() => setState(prev => ({ ...prev, isParentSummaryApproved: true }))}
          onBack={() => goBack(4)}
          onSubmit={() => handleSubmit(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* 취소 버튼 (항상 표시) */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </button>
      </div>
    </div>
  )
}
