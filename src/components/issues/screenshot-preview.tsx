'use client'

import { RefreshCw, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ScreenshotPreviewProps {
  imageUrl: string
  isUploaded: boolean
  onRetake: () => void
  onConfirm: () => void
  onCancel: () => void
  isUploading?: boolean
}

export function ScreenshotPreview({
  imageUrl,
  isUploaded,
  onRetake,
  onConfirm,
  onCancel,
  isUploading = false,
}: ScreenshotPreviewProps) {
  return (
    <div className="space-y-4">
      {/* 이미지 미리보기 영역 */}
      <div className="relative overflow-hidden rounded-lg border shadow-sm">
        <img
          src={imageUrl}
          alt="캡처된 스크린샷"
          className="max-h-[300px] w-full object-contain bg-muted"
        />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>업로드 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 영역 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* 왼쪽: 다시 캡처 + 취소 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetake}
            disabled={isUploading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 캡처
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isUploading}
          >
            <X className="mr-2 h-4 w-4" />
            취소
          </Button>
        </div>

        {/* 오른쪽: 확인 */}
        {isUploaded && (
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
          >
            <Check className="mr-2 h-4 w-4" />
            확인
          </Button>
        )}
      </div>

      {/* 상태 표시 */}
      {isUploaded && (
        <p className="text-sm text-muted-foreground">
          스크린샷이 성공적으로 업로드되었습니다.
        </p>
      )}
    </div>
  )
}
