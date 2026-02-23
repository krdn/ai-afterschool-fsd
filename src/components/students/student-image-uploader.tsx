"use client"

import { CldUploadWidget } from "next-cloudinary"
import { CldImage } from "next-cloudinary"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export type StudentImageType = "profile" | "face" | "palm"

export type StudentImagePayload = {
  type: StudentImageType
  originalUrl: string
  publicId: string
  format?: string
  bytes?: number
  width?: number
  height?: number
}

type StudentImageUploaderProps = {
  type: StudentImageType
  label: string
  description?: string
  studentId?: string
  draftId?: string
  previewUrl?: string | null
  value?: StudentImagePayload | null
  onChange?: (payload: StudentImagePayload | null) => void
  /** 삭제 버튼 표시 여부 (기본: false) */
  removable?: boolean
  studentName?: string
  /** 업로드 폴더를 직접 지정 (예: "teachers/{id}/profile"). 미지정 시 students 기본 경로 사용 */
  folder?: string
}

const allowedFormats = ["jpg", "jpeg", "png", "heic"]

// 파일 크기 제한: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

// 파일 업로드 전 검증
function validateFileBeforeUpload(file: File): boolean {
  // 파일 크기 검증 (10MB)
  if (file.size > MAX_FILE_SIZE) {
    toast.error("파일 크기 초과", {
      description: "파일은 최대 10MB까지 업로드할 수 있어요",
      id: "file-size-error",
    })
    return false
  }

  // 파일 형식 검증
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"]
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error("파일 형식 오류", {
      description: "JPG, PNG, WebP, HEIC 형식만 지원해요",
      id: "file-type-error",
    })
    return false
  }

  return true
}

// Cloudinary URL에서 publicId 추출
function extractPublicId(url: string): string {
  // 예: https://res.cloudinary.com/.../image/upload/v123456/students/student123/profile/abc123
  // → students/student123/profile/abc123
  const match = url.match(/\/upload\/v\d+\/(.+)$/)
  return match ? match[1] : url
}

// Cloudinary 설정 여부 (클라이언트 환경변수)
const isCloudinaryAvailable = Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)

export function StudentImageUploader({
  type,
  label,
  description,
  studentId,
  draftId,
  previewUrl,
  value,
  onChange,
  studentName,
  folder,
  removable = false,
}: StudentImageUploaderProps) {
  const uploadFolder = folder
    ? folder
    : studentId
      ? `students/${studentId}/${type}`
      : `students/drafts/${draftId || "draft"}/${type}`

  const hasPreview = Boolean(previewUrl || value)

  // Cloudinary publicId 우선 사용, 없으면 URL에서 추출
  const publicId = value?.publicId || (previewUrl ? extractPublicId(previewUrl) : "")

  // Cloudinary 미설정 시 fallback UI
  if (!isCloudinaryAvailable) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description ? (
            <p className="text-xs text-gray-500">{description}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-dashed border-gray-200 p-4">
          <p className="text-sm text-gray-400">이미지 업로드 서비스가 설정되지 않았습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description ? (
          <p className="text-xs text-gray-500">{description}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">
                {hasPreview ? "이미지 선택됨" : "이미지를 업로드해주세요"}
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, WebP, HEIC 파일 1장까지 업로드할 수 있어요 (최대 10MB).
              </p>
            </div>

            <div className="flex items-center gap-2">
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/sign"
              options={{
                multiple: false,
                maxFiles: 1,
                maxFileSize: MAX_FILE_SIZE,
                clientAllowedFormats: allowedFormats,
                sources: ["local", "camera", "url"],
                folder: uploadFolder,
                uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
              }}
              onOpen={(widget) => {
                // 위젯이 열릴 때 추가 검증이 필요하면 여기서 처리
              }}
              onUploadAdded={() => {
                // Cloudinary 위젯 옵션(maxFileSize, clientAllowedFormats)으로 검증
              }}
              onSuccess={(result) => {
                const info = result?.info as
                  | {
                      secure_url?: string
                      public_id?: string
                      format?: string
                      bytes?: number
                      width?: number
                      height?: number
                    }
                  | undefined

                if (!info?.secure_url || !info.public_id) {
                  toast.error("업로드 실패", {
                    description: "이미지 업로드 중 오류가 발생했어요. 다시 시도해주세요.",
                    id: "upload-error",
                  })
                  return
                }

                toast.success("업로드 완료", {
                  description: "이미지가 성공적으로 업로드되었어요",
                  id: "upload-success",
                })

                onChange?.({
                  type,
                  originalUrl: info.secure_url,
                  publicId: info.public_id,
                  format: info.format,
                  bytes: info.bytes,
                  width: info.width,
                  height: info.height,
                })
              }}
              onError={(error) => {
                console.error("Upload error:", error)

                // error 타입 추출: string | { status; statusText } | null
                const errorMsg = typeof error === 'string'
                  ? error
                  : error && typeof error === 'object' && 'statusText' in error
                    ? error.statusText
                    : ''

                // 파일 크기 초과 에러
                if (
                  errorMsg?.includes("File too large") ||
                  errorMsg?.includes("exceeds") ||
                  errorMsg?.includes("max file size")
                ) {
                  toast.error("파일 크기 초과", {
                    description: "파일은 최대 10MB까지 업로드할 수 있어요",
                    id: "file-size-error",
                  })
                  return
                }

                // 형식 불일치 에러
                if (
                  errorMsg?.includes("Invalid") ||
                  errorMsg?.includes("format") ||
                  errorMsg?.includes("allowed formats")
                ) {
                  toast.error("파일 형식 오류", {
                    description: "JPG, PNG, WebP, HEIC 형식만 지원해요",
                    id: "file-format-error",
                  })
                  return
                }

                // 네트워크 에러
                if (errorMsg?.includes("Network") || errorMsg?.includes("fetch")) {
                  toast.error("네트워크 오류", {
                    description: "이미지 업로드 중 연결 오류가 발생했어요. 네트워크 연결을 확인해주세요.",
                    id: "network-error",
                  })
                  return
                }

                // 기타 에러
                toast.error("업로드 실패", {
                  description: "이미지 업로드 중 오류가 발생했어요. 다시 시도해주세요.",
                  id: "upload-error",
                })
              }}
            >
              {({ open, isLoading }) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isLoading) {
                      open()
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "업로드 중..."
                    : hasPreview
                      ? "교체하기"
                      : "업로드"}
                </Button>
              )}
            </CldUploadWidget>

            {removable && hasPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  onChange?.(null)
                  toast.success("사진이 삭제되었어요", { id: "image-removed" })
                }}
              >
                삭제
              </Button>
            )}
            </div>
          </div>

          {publicId ? (
            <div className="rounded-md border border-gray-100 bg-white p-2">
              <CldImage
                width={128}
                height={128}
                src={publicId}
                sizes="(max-width: 768px) 100vw, 128px"
                alt={`${studentName || '학생'}의 ${label} 사진`}
                className="h-32 w-32 rounded-md object-cover"
                crop="fill"
                gravity="auto"
                quality="auto"
                format="auto"
                loading="lazy"
                priority={false}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
