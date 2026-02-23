'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReportTabProps {
  studentId: string
  studentName: string
}

export default function ReportTab({ studentId, studentName }: ReportTabProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/students/${studentId}/report`)
      if (!response.ok) {
        throw new Error('PDF 생성 실패')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${studentName}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF 다운로드 완료', { id: 'pdf-download-success' })
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error('PDF 다운로드 실패', { id: 'pdf-download-error' })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="report-tab">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            종합 리포트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600" data-testid="report-description">
            학생의 모든 분석 결과가 포함된 종합 리포트를 다운로드할 수 있습니다.
          </p>

          <div className="flex gap-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
              data-testid="download-report-button"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  PDF 다운로드
                </>
              )}
            </Button>
          </div>

          {/* 포함될 내용 안내 */}
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold mb-4" data-testid="report-contents-title">
              포함될 내용
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1" data-testid="report-contents-list">
              <li>기본 정보 (이름, 학교, 학년)</li>
              <li>사주 분석</li>
              <li>이름 분석</li>
              <li>MBTI 성격 유형</li>
              <li>관상 분석</li>
              <li>손금 분석</li>
              <li>학습 전략</li>
              <li>진로 가이드</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
