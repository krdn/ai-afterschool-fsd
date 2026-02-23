'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'
import { ScreenshotCapture } from './screenshot-capture'
import { IssueForm, type IssueFormData } from './issue-form'
import { createIssue } from '@/lib/actions/common/issues'

interface IssueReportModalProps {
  isOpen: boolean
  onClose: () => void
  userRole: string
}

export function IssueReportModal({ isOpen, onClose, userRole }: IssueReportModalProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message?: string
  } | null>(null)

  const handleScreenshotCapture = useCallback((url: string) => {
    setScreenshotUrl(url)
  }, [])

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshotUrl(null)
  }, [])

  const handleSubmit = useCallback(
    async (formData: IssueFormData) => {
      setIsSubmitting(true)
      setSubmitResult(null)

      try {
        // userContext 생성
        const userContext = {
          role: userRole,
          url: typeof window !== 'undefined' ? window.location.href : '',
          timestamp: new Date().toISOString(),
        }

        // FormData 구성
        const submitFormData = new FormData()
        submitFormData.append('title', formData.title)
        submitFormData.append('description', formData.description)
        submitFormData.append('category', formData.category)
        submitFormData.append('priority', 'MEDIUM')
        
        if (screenshotUrl) {
          submitFormData.append('screenshotUrl', screenshotUrl)
        }
        submitFormData.append('userContext', JSON.stringify(userContext))

        // Server Action 호출
        const result = await createIssue({}, submitFormData)

        if (result.success) {
          setSubmitResult({
            success: true,
            message: result.message || '이슈가 등록되었습니다.',
          })
          // 1.5초 후 모달 닫기
          setTimeout(() => {
            onClose()
            // 상태 초기화
            setScreenshotUrl(null)
            setSubmitResult(null)
          }, 1500)
        } else {
          setSubmitResult({
            success: false,
            message: result.errors?._form?.[0] || '이슈 등록에 실패했습니다.',
          })
        }
      } catch (error) {
        setSubmitResult({
          success: false,
          message: '이슈 등록 중 오류가 발생했습니다.',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [screenshotUrl, userRole, onClose]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose()
        // 모달이 닫힐 때 상태 초기화
        setScreenshotUrl(null)
        setSubmitResult(null)
      }
    },
    [onClose]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>이슈 보고하기</DialogTitle>
          <DialogDescription>
            발견하신 문제나 개선사항을 알려주세요. 스크린샷을 첨부하면 더 정확한 확인이 가능합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* 성공 메시지 */}
          {submitResult?.success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {submitResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 에러 메시지 */}
          {submitResult && !submitResult.success && (
            <Alert variant="destructive">
              <AlertDescription>{submitResult.message}</AlertDescription>
            </Alert>
          )}

          {/* 스크린샷 섹션 */}
          {!screenshotUrl && !submitResult?.success && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">스크린샷 캡처 (선택사항)</h3>
              <ScreenshotCapture
                onCapture={handleScreenshotCapture}
                onError={(error) => {
                  console.error('Screenshot capture error:', error)
                }}
              />
            </div>
          )}

          {screenshotUrl && !submitResult?.success && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">첨부된 스크린샷</h3>
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                  disabled={isSubmitting}
                >
                  제거하고 다시 캡처
                </button>
              </div>
              <div className="relative overflow-hidden rounded-md border">
                <img
                  src={screenshotUrl}
                  alt="첨부된 스크린샷"
                  className="max-h-48 w-auto object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {/* 구분선 */}
          {(!submitResult?.success || !screenshotUrl) && (
            <hr className="border-t" />
          )}

          {/* 이슈 폼 섹션 */}
          {!submitResult?.success && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">이슈 정보</h3>
              <IssueForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                screenshotUrl={screenshotUrl || undefined}
                onRemoveScreenshot={screenshotUrl ? handleRemoveScreenshot : undefined}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
