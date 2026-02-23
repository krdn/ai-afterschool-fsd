"use server"

import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { cloudinary, buildResizedImageUrl } from "@/lib/cloudinary"
import {
  StudentImageSchema,
  type StudentImageInput,
} from "@/lib/validations/student-images"
import { z } from "zod"
import { okVoid, fail, type ActionVoidResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

export type StudentImageTypeValue = StudentImageInput["type"]

export type StudentImageResult = ActionVoidResult

export async function setStudentImage(
  studentId: string,
  payload: StudentImageInput
): Promise<StudentImageResult> {
  try {
    const session = await verifySession()

    // 스키마 검증
    let validatedPayload: StudentImageInput
    try {
      validatedPayload = StudentImageSchema.parse(payload)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error({ detail: error.issues }, 'Validation error')
        // 사용자 친화적인 에러 메시지 생성
        const firstError = error.issues[0]
        if (firstError.path.includes("bytes")) {
          return fail("파일 크기는 10MB 이하여야 해요")
        }
        if (firstError.path.includes("originalUrl")) {
          return fail("이미지 URL이 올바르지 않아요")
        }
        return fail("이미지 정보 형식이 올바르지 않아요")
      }
      return fail("이미지 검증 중 오류가 발생했어요")
    }

    // 학생 존재 여부 및 권한 확인
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        ...(session.role === "DIRECTOR" ? {} : { teacherId: session.userId }),
      },
    })

    if (!student) {
      return fail("학생을 찾을 수 없어요")
    }

    // 기존 이미지 확인
    const existingImage = await db.studentImage.findUnique({
      where: {
        studentId_type: {
          studentId,
          type: validatedPayload.type,
        },
      },
    })

    const resizedUrl = buildResizedImageUrl(validatedPayload.publicId)

    // 이미지 저장
    await db.studentImage.upsert({
      where: {
        studentId_type: {
          studentId,
          type: validatedPayload.type,
        },
      },
      create: {
        studentId,
        type: validatedPayload.type,
        originalUrl: validatedPayload.originalUrl,
        resizedUrl,
        publicId: validatedPayload.publicId,
        format: validatedPayload.format,
        bytes: validatedPayload.bytes,
        width: validatedPayload.width,
        height: validatedPayload.height,
      },
      update: {
        originalUrl: validatedPayload.originalUrl,
        resizedUrl,
        publicId: validatedPayload.publicId,
        format: validatedPayload.format,
        bytes: validatedPayload.bytes,
        width: validatedPayload.width,
        height: validatedPayload.height,
      },
    })

    // 기존 이미지가 있고 publicId가 변경된 경우 Cloudinary에서 삭제
    if (existingImage && existingImage.publicId !== validatedPayload.publicId) {
      try {
        await cloudinary.uploader.destroy(existingImage.publicId)
      } catch (error) {
        logger.error({ err: error }, 'Failed to delete old Cloudinary asset')
        // 실패해도 메인 작업은 성공한 것으로 처리
      }
    }

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'setStudentImage error')

    // 네트워크 또는 Cloudinary 에러 처리
    if (error instanceof Error) {
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return fail("이미지 업로드 중 연결 오류가 발생했어요")
      }
      if (error.message.includes("Cloudinary")) {
        return fail("이미지 서비스 오류가 발생했어요. 잠시 후 다시 시도해주세요")
      }
    }

    return fail("이미지 저장 중 오류가 발생했어요. 다시 시도해주세요")
  }
}

export async function deleteStudentImage(
  studentId: string,
  type: StudentImageTypeValue
): Promise<StudentImageResult> {
  try {
    const session = await verifySession()

    // 학생 존재 여부 및 권한 확인
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        ...(session.role === "DIRECTOR" ? {} : { teacherId: session.userId }),
      },
    })

    if (!student) {
      return fail("학생을 찾을 수 없어요")
    }

    // 기존 이미지 확인
    const existingImage = await db.studentImage.findUnique({
      where: {
        studentId_type: {
          studentId,
          type,
        },
      },
    })

    if (!existingImage) {
      return okVoid()
    }

    // 데이터베이스에서 삭제
    await db.studentImage.delete({
      where: {
        studentId_type: {
          studentId,
          type,
        },
      },
    })

    // Cloudinary에서 삭제
    try {
      await cloudinary.uploader.destroy(existingImage.publicId)
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete Cloudinary asset')
      // 실패해도 DB 삭제는 성공한 것으로 처리
    }

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'deleteStudentImage error')
    return fail("이미지 삭제 중 오류가 발생했어요. 다시 시도해주세요")
  }
}
