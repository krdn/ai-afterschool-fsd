'use client'

import { useState, useCallback } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureScreenshot, blobToFile } from '@/lib/screenshot/capture'
import { ScreenshotPreview } from './screenshot-preview'

export interface ScreenshotCaptureProps {
  onCapture: (url: string) => void
  onError?: (error: Error) => void
}

type CaptureState = 'idle' | 'capturing' | 'captured' | 'uploading' | 'uploaded'

export function ScreenshotCapture({ onCapture, onError }: ScreenshotCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [uploadedUrl, setUploadedUrl] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleCapture = useCallback(async () => {
    setError('')
    setState('capturing')

    try {
      // Dialog 관련 요소를 캡처에서 제외 (overlay, dialog, focus guard)
      const dialogElements = new Set(
        document.querySelectorAll(
          '[role="dialog"], [data-slot="dialog-overlay"], [data-radix-focus-guard], [data-radix-portal]'
        )
      )

      const blob = await captureScreenshot({
        type: 'image/png',
        quality: 0.9,
        // DOM 클론 시 모달 관련 노드를 제외 (해당 노드와 모든 자식이 제외됨)
        filter: (node: Node) => {
          if (node instanceof Element) {
            return !dialogElements.has(node)
          }
          return true
        },
      })

      const url = URL.createObjectURL(blob)
      setCapturedBlob(blob)
      setPreviewUrl(url)
      setState('captured')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스크린샷 캡처 중 오류가 발생했습니다.'
      setError(errorMessage)
      setState('idle')
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }, [onError])

  const handleUpload = useCallback(async () => {
    if (!capturedBlob) return

    setState('uploading')

    try {
      const filename = `screenshot-${Date.now()}.png`
      const file = blobToFile(capturedBlob, filename)

      // 서버 API Route를 통해 업로드 (클라이언트에서 S3 직접 접근 불가)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/screenshot', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      const data = await response.json()
      setUploadedUrl(data.url)
      setState('uploaded')
      onCapture(data.url)

      // Clean up preview URL
      URL.revokeObjectURL(previewUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.'
      setError(errorMessage)
      setState('captured') // Return to captured state to allow retry
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }, [capturedBlob, previewUrl, onCapture, onError])

  const handleRetake = useCallback(() => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setCapturedBlob(null)
    setPreviewUrl('')
    setUploadedUrl('')
    setError('')
    setState('idle')
  }, [previewUrl])

  const handleCancel = useCallback(() => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setCapturedBlob(null)
    setPreviewUrl('')
    setUploadedUrl('')
    setError('')
    setState('idle')
  }, [previewUrl])

  const handleConfirm = useCallback(() => {
    // Already uploaded, just signal completion
    if (uploadedUrl) {
      onCapture(uploadedUrl)
    }
  }, [uploadedUrl, onCapture])

  // Render based on state
  if (state === 'idle') {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={handleCapture}
          className="w-full sm:w-auto"
        >
          <Camera className="mr-2 h-4 w-4" />
          스크린샷 캡처
        </Button>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }

  if (state === 'capturing') {
    return (
      <Button disabled variant="outline" className="w-full sm:w-auto">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        캡처 중...
      </Button>
    )
  }

  if (state === 'captured' || state === 'uploading' || state === 'uploaded') {
    return (
      <div className="space-y-4">
        <ScreenshotPreview
          imageUrl={state === 'uploaded' ? uploadedUrl : previewUrl}
          isUploaded={state === 'uploaded'}
          isUploading={state === 'uploading'}
          onRetake={handleRetake}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
        {state === 'captured' && (
          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              className="w-full sm:w-auto"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              업로드 및 확인
            </Button>
          </div>
        )}
        {state === 'uploading' && (
          <div className="flex justify-end">
            <Button disabled className="w-full sm:w-auto">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              업로드 중...
            </Button>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }

  return null
}
