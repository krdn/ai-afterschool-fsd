'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, AlertCircle } from 'lucide-react'
import { generateConsultationReport } from '@/app/[locale]/(dashboard)/students/[id]/report/actions'

type ReportStatus = 'none' | 'generating' | 'complete' | 'failed'

interface ReportButtonClientProps {
  studentId: string
  initialStatus: ReportStatus
  initialFileUrl?: string | null  // Kept for backward compatibility but unused
}

export function ReportButtonClient({
  studentId,
  initialStatus,
  initialFileUrl,
}: ReportButtonClientProps) {
  const [status, setStatus] = useState<ReportStatus>(initialStatus)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    setIsPolling(true)
    try {
      const response = await fetch(
        `/api/students/${studentId}/report/status`
      )
      if (!response.ok) {
        throw new Error('상태 조회 실패')
      }

      const data = await response.json()
      setStatus(data.status || 'none')
      setErrorMessage(data.errorMessage)

      // Stop polling if complete or failed
      if (data.status === 'complete' || data.status === 'failed') {
        setIsPolling(false)
      }
    } catch (error) {
      console.error('Status poll error:', error)
      setIsPolling(false)
    }
  }, [studentId])

  // Start polling when status becomes 'generating'
  useEffect(() => {
    if (status === 'generating' && !isPolling) {
      const interval = setInterval(pollStatus, 2000) // Poll every 2 seconds

      return () => clearInterval(interval)
    }
  }, [status, isPolling, pollStatus])

  // Handle generate button click
  const handleGenerate = async () => {
    const result = await generateConsultationReport(studentId)

    if (result.success) {
      if (result.cached) {
        // Cached PDF available immediately
        setStatus('complete')
      } else {
        // Start generation
        setStatus('generating')
        setIsPolling(true)
      }
    } else {
      // Error occurred
      setStatus('failed')
      setErrorMessage(result.error || '생성 실패')
    }
  }

  // Handle retry after failure
  const handleRetry = () => {
    setStatus('none')
    setErrorMessage(null)
    handleGenerate()
  }

  // Render based on status
  if (status === 'generating') {
    return (
      <Button disabled variant="outline">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        생성 중...
      </Button>
    )
  }

  if (status === 'complete') {
    return (
      <Button asChild>
        <a href={`/api/students/${studentId}/report`} download>
          <Download className="mr-2 h-4 w-4" />
          PDF 다운로드
        </a>
      </Button>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <Button variant="destructive" onClick={handleRetry} size="sm">
          <AlertCircle className="mr-2 h-4 w-4" />
          재시도
        </Button>
        {errorMessage && (
          <span className="text-sm text-red-600">{errorMessage}</span>
        )}
      </div>
    )
  }

  // Default: none status - show generate button
  return (
    <Button onClick={handleGenerate}>
      <FileText className="mr-2 h-4 w-4" />
      보고서 생성
    </Button>
  )
}
