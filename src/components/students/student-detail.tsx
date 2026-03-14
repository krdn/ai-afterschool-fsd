"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { toast } from "sonner"
import { deleteStudent } from "@/lib/actions/student/crud"
import {
  deleteStudentImage,
  setStudentImage,
} from "@/lib/actions/student/images"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  StudentImageUploader,
  type StudentImagePayload,
  type StudentImageType,
} from "@/components/students/student-image-uploader"
import { StudentImageTabs } from "@/components/students/student-image-tabs"
import { StudentAnalysisStatus } from "@/components/students/student-analysis-status"
import type { CalculationStatus } from '@/features/analysis'

type StudentDetailProps = {
  student: {
    id: string
    name: string
    birthDate: Date | string
    phone: string | null
    school: string
    grade: number
    targetUniversity: string | null
    targetMajor: string | null
    nationality: string | null
    bloodType: "A" | "B" | "AB" | "O" | null
    createdAt: Date | string
    images?: StudentImageRecord[]
  }
  analysisStatus?: CalculationStatus | null
}

type StudentImageRecord = {
  type: StudentImagePayload["type"]
  originalUrl: string
  resizedUrl: string
  publicId: string
  format: string | null
  bytes: number | null
  width: number | null
  height: number | null
}

const imageLabels: Record<StudentImageType, string> = {
  profile: "프로필",
  face: "관상",
  palm: "손금",
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function StudentDetail({ student, analysisStatus }: StudentDetailProps) {
  const boundDeleteStudent = deleteStudent.bind(null, student.id)
  const birthDate = toDate(student.birthDate)
  const createdAt = toDate(student.createdAt)
  const [activeType, setActiveType] = useState<StudentImageType>("profile")
  const [isPending, startTransition] = useTransition()
  const [deleteStudentOpen, setDeleteStudentOpen] = useState(false)
  const [deleteImageOpen, setDeleteImageOpen] = useState(false)
  const [imagesByType, setImagesByType] = useState<
    Record<StudentImageType, StudentImageRecord | null>
  >(() => {
    const initial: Record<StudentImageType, StudentImageRecord | null> = {
      profile: null,
      face: null,
      palm: null,
    }

    student.images?.forEach((image) => {
      initial[image.type] = image
    })

    return initial
  })

  const currentImage = imagesByType[activeType]
  const tabImages = {
    profile: imagesByType.profile
      ? {
          resizedUrl: imagesByType.profile.resizedUrl,
          originalUrl: imagesByType.profile.originalUrl,
        }
      : undefined,
    face: imagesByType.face
      ? {
          resizedUrl: imagesByType.face.resizedUrl,
          originalUrl: imagesByType.face.originalUrl,
        }
      : undefined,
    palm: imagesByType.palm
      ? {
          resizedUrl: imagesByType.palm.resizedUrl,
          originalUrl: imagesByType.palm.originalUrl,
        }
      : undefined,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{student.name}</h1>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/students/${student.id}/edit`}>수정</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteStudentOpen(true)}
          >
            삭제
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <StudentImageTabs
              value={activeType}
              onChange={setActiveType}
              images={tabImages}
            />
          </div>
          <div className="w-full space-y-4 lg:w-80">
            <StudentImageUploader
              key={activeType}
              type={activeType}
              label={`${imageLabels[activeType]} 사진`}
              description="현재 선택된 탭의 이미지를 업로드합니다."
              studentId={student.id}
              previewUrl={
                currentImage?.resizedUrl || currentImage?.originalUrl || null
              }
              value={
                currentImage
                  ? {
                      type: currentImage.type,
                      originalUrl: currentImage.originalUrl,
                      publicId: currentImage.publicId,
                      format: currentImage.format || undefined,
                      bytes: currentImage.bytes || undefined,
                      width: currentImage.width || undefined,
                      height: currentImage.height || undefined,
                    }
                  : null
              }
              onChange={(payload) => {
                if (!payload) return
                startTransition(async () => {
                  const result = await setStudentImage(student.id, payload)

                  if (result.success) {
                    setImagesByType((prev) => ({
                      ...prev,
                      [payload.type]: {
                        type: payload.type,
                        originalUrl: payload.originalUrl,
                        resizedUrl: null,
                        publicId: payload.publicId,
                        format: payload.format || null,
                        bytes: payload.bytes || null,
                        width: payload.width || null,
                        height: payload.height || null,
                      },
                    }))
                  } else {
                    toast.error("이미지 저장 실패", {
                      description: result.error,
                      id: "image-save-error",
                    })
                  }
                })
              }}
            />
            <Button
              type="button"
              variant="destructive"
              disabled={!currentImage || isPending}
              onClick={() => {
                if (!currentImage) return
                setDeleteImageOpen(true)
              }}
            >
              {isPending ? "처리 중..." : "삭제하기"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">이름</dt>
              <dd className="mt-1 font-medium">{student.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">생년월일</dt>
              <dd className="mt-1 font-medium">
                {format(birthDate, "yyyy년 M월 d일", { locale: ko })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">국적</dt>
              <dd className="mt-1 font-medium">
                {student.nationality || "한국"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">연락처</dt>
              <dd className="mt-1 font-medium">{student.phone || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">혈액형</dt>
              <dd className="mt-1 font-medium">
                {student.bloodType ? `${student.bloodType}형` : "-"}
              </dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>학업 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">학교</dt>
              <dd className="mt-1 font-medium">{student.school}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">학년</dt>
              <dd className="mt-1 font-medium">{student.grade}학년</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">목표 대학</dt>
              <dd className="mt-1 font-medium">
                {student.targetUniversity || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">목표 학과</dt>
              <dd className="mt-1 font-medium">{student.targetMajor || "-"}</dd>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>분석 상태</CardTitle>
          <StudentAnalysisStatus status={analysisStatus ?? null} />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          사주/성명학 분석이 최신인지 확인합니다.
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        등록일: {format(createdAt, "yyyy년 M월 d일", { locale: ko })}
      </p>

      <ConfirmDialog
        open={deleteStudentOpen}
        onOpenChange={setDeleteStudentOpen}
        title="학생 삭제"
        description="정말 삭제하시겠어요? 이 학생의 모든 데이터가 삭제되며 되돌릴 수 없습니다."
        confirmLabel="삭제"
        onConfirm={async () => {
          await boundDeleteStudent()
        }}
      />

      <ConfirmDialog
        open={deleteImageOpen}
        onOpenChange={setDeleteImageOpen}
        title="이미지 삭제"
        description={`선택한 ${imageLabels[activeType]} 이미지를 삭제하시겠어요?`}
        confirmLabel="삭제"
        onConfirm={async () => {
          const result = await deleteStudentImage(student.id, activeType)
          if (result.success) {
            setImagesByType((prev) => ({
              ...prev,
              [activeType]: null,
            }))
            toast.success("이미지 삭제 완료")
          } else {
            toast.error("이미지 삭제 실패", { description: result.error })
          }
        }}
      />
    </div>
  )
}
