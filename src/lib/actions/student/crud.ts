"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import {
  CreateStudentSchema,
  NameHanjaSchema,
  type NameHanjaInput,
  UpdateStudentSchema,
} from "@/lib/validations/students"
import {
  StudentImageSchema,
  type StudentImageInput,
} from "@/lib/validations/student-images"
import { setStudentImage } from "@/lib/actions/student/images"
import { markStudentRecalculationNeeded } from '@/features/analysis'
import { eventBus } from "@/lib/events/event-bus"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

export type StudentFormState = {
  errors?: {
    name?: string[]
    birthDate?: string[]
    birthTimeHour?: string[]
    birthTimeMinute?: string[]
    phone?: string[]
    school?: string[]
    grade?: string[]
    nationality?: string[]
    targetUniversity?: string[]
    targetMajor?: string[]
    bloodType?: string[]
    fatherName?: string[]
    fatherPhone?: string[]
    motherName?: string[]
    motherPhone?: string[]
    _form?: string[]
  }
  message?: string
  success?: boolean
  studentId?: string
  redirectUrl?: string
}

type ImageFieldConfig = {
  key: "profileImage" | "faceImage" | "palmImage"
  expectedType: StudentImageInput["type"]
}

const imageFieldConfigs: ImageFieldConfig[] = [
  { key: "profileImage", expectedType: "profile" },
  { key: "faceImage", expectedType: "face" },
  { key: "palmImage", expectedType: "palm" },
]

function parseNameHanjaPayload(value: FormDataEntryValue | null): {
  nameHanja: NameHanjaInput | null
  error?: string
} {
  if (!value) return { nameHanja: null }
  if (typeof value !== "string") {
    return { nameHanja: null, error: "한자 정보 형식이 올바르지 않아요." }
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(value)
  } catch {
    return { nameHanja: null, error: "한자 정보 형식이 올바르지 않아요." }
  }

  if (Array.isArray(parsedValue)) {
    parsedValue = parsedValue.map((entry) => {
      if (!entry || typeof entry !== "object") return entry
      const record = entry as { syllable?: unknown; hanja?: unknown }
      return {
        syllable: record.syllable,
        hanja: record.hanja === "" ? null : record.hanja,
      }
    })
  }

  const parsed = NameHanjaSchema.safeParse(parsedValue)

  if (!parsed.success) {
    return { nameHanja: null, error: "한자 정보 형식이 올바르지 않아요." }
  }

  return { nameHanja: parsed.data }
}

function parseImagePayloads(formData: FormData): {
  images: StudentImageInput[]
  error?: string
} {
  const images: StudentImageInput[] = []

  for (const { key, expectedType } of imageFieldConfigs) {
    const value = formData.get(key)

    if (!value) {
      continue
    }

    if (typeof value !== "string") {
      return { images, error: "이미지 정보 형식이 올바르지 않아요." }
    }

    let parsedValue: unknown

    try {
      parsedValue = JSON.parse(value)
    } catch {
      return { images, error: "이미지 정보 형식이 올바르지 않아요." }
    }

    const parsed = StudentImageSchema.safeParse(parsedValue)

    if (!parsed.success || parsed.data.type !== expectedType) {
      return { images, error: "이미지 정보 형식이 올바르지 않아요." }
    }

    images.push(parsed.data)
  }

  return { images }
}

function hasDateChanged(current: Date, nextValue?: string) {
  if (!nextValue) return false
  const nextDate = new Date(nextValue)
  if (Number.isNaN(nextDate.getTime())) return false
  return current.getTime() !== nextDate.getTime()
}

function normalizeBirthTimeInput(
  birthTimeHour?: number,
  birthTimeMinute?: number
) {
  if (birthTimeHour === undefined) {
    return {
      birthTimeHour: null,
      birthTimeMinute: null,
    }
  }

  return {
    birthTimeHour,
    birthTimeMinute: birthTimeMinute ?? 0,
  }
}

export async function createStudent(
  prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const session = await verifySession()

  const validatedFields = CreateStudentSchema.safeParse({
    name: formData.get("name"),
    birthDate: formData.get("birthDate"),
    birthTimeHour: formData.get("birthTimeHour") || undefined,
    birthTimeMinute: formData.get("birthTimeMinute") || undefined,
    phone: formData.get("phone") || undefined,
    school: formData.get("school"),
    grade: formData.get("grade"),
    nationality: formData.get("nationality") || undefined,
    targetUniversity: formData.get("targetUniversity") || undefined,
    targetMajor: formData.get("targetMajor") || undefined,
    bloodType: formData.get("bloodType") || null,
    fatherName: formData.get("fatherName") || undefined,
    fatherPhone: formData.get("fatherPhone") || undefined,
    motherName: formData.get("motherName") || undefined,
    motherPhone: formData.get("motherPhone") || undefined,
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const imagePayloads = parseImagePayloads(formData)

  const nameHanjaPayload = parseNameHanjaPayload(formData.get("nameHanja"))

  if (imagePayloads.error) {
    return {
      errors: {
        _form: [imagePayloads.error],
      },
    }
  }

  if (nameHanjaPayload.error) {
    return {
      errors: {
        _form: [nameHanjaPayload.error],
      },
    }
  }

  let studentId: string
  const {
    birthTimeHour,
    birthTimeMinute,
    fatherName,
    fatherPhone,
    motherName,
    motherPhone,
    ...studentData
  } = validatedFields.data
  const birthTime = normalizeBirthTimeInput(birthTimeHour, birthTimeMinute)

  try {
    const student = await db.student.create({
      data: {
        ...studentData,
        nameHanja: nameHanjaPayload.nameHanja as Prisma.InputJsonValue,
        birthDate: new Date(validatedFields.data.birthDate),
        ...birthTime,
        teacherId: session.userId,
      },
    })

    studentId = student.id

    // 어머니 보호자 생성 (isPrimary 우선)
    if (motherName) {
      await db.parent.create({
        data: {
          studentId,
          name: motherName,
          phone: motherPhone || "",
          relation: "MOTHER",
          isPrimary: true,
        },
      })
    }

    // 아버지 보호자 생성
    if (fatherName) {
      await db.parent.create({
        data: {
          studentId,
          name: fatherName,
          phone: fatherPhone || "",
          relation: "FATHER",
          isPrimary: !motherName, // 어머니가 없을 때만 isPrimary
        },
      })
    }

    for (const imagePayload of imagePayloads.images) {
      const imageResult = await setStudentImage(studentId, imagePayload)
      if (!imageResult.success) {
        logger.error({ detail: imageResult.error }, 'Failed to save student image')
        return {
          errors: {
            _form: [`이미지 저장 실패: ${imageResult.error}`],
          },
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to create student')
    return {
      errors: {
        _form: ["학생 등록 중 오류가 발생했어요. 다시 시도해주세요."],
      },
    }
  }

  eventBus.emit('student.created', { studentId, teacherId: session.userId })

  revalidatePath("/students")
  redirect(`/students/${studentId}?created=true`)
}

export async function updateStudent(
  studentId: string,
  prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const session = await verifySession()

  const existingStudent = await db.student.findFirst({
    where: {
      id: studentId,
      ...(session.role === "DIRECTOR" ? {} : { teacherId: session.userId }),
    },
  })

  if (!existingStudent) {
    return {
      errors: {
        _form: ["학생을 찾을 수 없어요."],
      },
    }
  }

  const validatedFields = UpdateStudentSchema.safeParse({
    name: formData.get("name"),
    birthDate: formData.get("birthDate"),
    birthTimeHour: formData.get("birthTimeHour") || undefined,
    birthTimeMinute: formData.get("birthTimeMinute") || undefined,
    phone: formData.get("phone") || undefined,
    school: formData.get("school"),
    grade: formData.get("grade"),
    nationality: formData.get("nationality") || undefined,
    targetUniversity: formData.get("targetUniversity") || undefined,
    targetMajor: formData.get("targetMajor") || undefined,
    bloodType: formData.get("bloodType") || null,
    fatherName: formData.get("fatherName") || undefined,
    fatherPhone: formData.get("fatherPhone") || undefined,
    motherName: formData.get("motherName") || undefined,
    motherPhone: formData.get("motherPhone") || undefined,
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const imagePayloads = parseImagePayloads(formData)
  const nameHanjaPayload = parseNameHanjaPayload(formData.get("nameHanja"))

  if (imagePayloads.error) {
    return {
      errors: {
        _form: [imagePayloads.error],
      },
    }
  }

  if (nameHanjaPayload.error) {
    return {
      errors: {
        _form: [nameHanjaPayload.error],
      },
    }
  }

  try {
    const birthTime = normalizeBirthTimeInput(
      validatedFields.data.birthTimeHour,
      validatedFields.data.birthTimeMinute
    )
    const {
      birthTimeHour: _birthTimeHour,
      birthTimeMinute: _birthTimeMinute,
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      ...updateData
    } = validatedFields.data
    const shouldMarkRecalculation = Boolean(
      (validatedFields.data.name &&
        validatedFields.data.name !== existingStudent.name) ||
        hasDateChanged(existingStudent.birthDate, validatedFields.data.birthDate)
    )
    const birthTimeChanged =
      existingStudent.birthTimeHour !== birthTime.birthTimeHour ||
      existingStudent.birthTimeMinute !== birthTime.birthTimeMinute
    const nextNameHanja = JSON.stringify(nameHanjaPayload.nameHanja ?? null)
    const previousNameHanja = JSON.stringify(existingStudent.nameHanja ?? null)
    const nameHanjaChanged = nextNameHanja !== previousNameHanja

    await db.student.update({
      where: { id: studentId },
      data: {
        ...updateData,
        nameHanja: nameHanjaPayload.nameHanja as Prisma.InputJsonValue,
        birthDate: validatedFields.data.birthDate
          ? new Date(validatedFields.data.birthDate)
          : undefined,
        ...birthTime,
      },
    })

    if (shouldMarkRecalculation || nameHanjaChanged || birthTimeChanged) {
      // 원장/팀장은 다른 선생님의 학생도 수정 가능 → teacherId를 null로 전달하여 소유권 체크 스킵
      const recalcTeacherId = session.role === "TEACHER" ? session.userId : null
      await markStudentRecalculationNeeded(
        studentId,
        recalcTeacherId,
        birthTimeChanged
          ? "학생 출생 시간 변경"
          : nameHanjaChanged
            ? "학생 한자 정보 변경"
            : "학생 기본 정보 변경"
      )
    }

    // relation별 보호자 upsert/삭제
    const parentEntries: Array<{
      relation: "FATHER" | "MOTHER"
      name: string | undefined
      phone: string | undefined
    }> = [
      { relation: "MOTHER", name: motherName, phone: motherPhone },
      { relation: "FATHER", name: fatherName, phone: fatherPhone },
    ]

    const existingParents = await db.parent.findMany({
      where: { studentId },
    })

    for (const entry of parentEntries) {
      const existing = existingParents.find(
        (p) => p.relation === entry.relation
      )

      if (entry.name) {
        if (existing) {
          await db.parent.update({
            where: { id: existing.id },
            data: {
              name: entry.name,
              phone: entry.phone || "",
            },
          })
        } else {
          await db.parent.create({
            data: {
              studentId,
              name: entry.name,
              phone: entry.phone || "",
              relation: entry.relation,
              isPrimary: false, // 아래에서 재설정
            },
          })
        }
      } else if (existing) {
        await db.parent.delete({
          where: { id: existing.id },
        })
      }
    }

    // isPrimary 재설정: 어머니 우선, 없으면 아버지
    const remainingParents = await db.parent.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
    })
    if (remainingParents.length > 0) {
      const primaryId =
        remainingParents.find((p) => p.relation === "MOTHER")?.id ??
        remainingParents[0].id
      for (const p of remainingParents) {
        await db.parent.update({
          where: { id: p.id },
          data: { isPrimary: p.id === primaryId },
        })
      }
    }

    for (const imagePayload of imagePayloads.images) {
      const imageResult = await setStudentImage(studentId, imagePayload)
      if (!imageResult.success) {
        logger.error({ detail: imageResult.error }, 'Failed to save student image')
        return {
          errors: {
            _form: [`이미지 저장 실패: ${imageResult.error}`],
          },
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to update student')
    return {
      errors: {
        _form: ["학생 정보 수정 중 오류가 발생했어요. 다시 시도해주세요."],
      },
    }
  }

  revalidatePath("/students")
  revalidatePath(`/students/${studentId}`)
  redirect(`/students/${studentId}`)
}

export async function deleteStudent(studentId: string): Promise<void> {
  const session = await verifySession()

  await db.student.deleteMany({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
  })

  revalidatePath("/students")
  redirect("/students")
}

export type StudentWithParents = {
  id: string
  name: string
  school: string | null
  grade: number | null
  parents: Array<{
    id: string
    name: string
    relation: string
  }>
}

export type StudentListData = {
  data: StudentWithParents[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

export type GetStudentsResult = ActionResult<StudentListData>

/**
 * 학생 목록 조회 액션
 * - 인증 체크
 * - TEACHER 역할 시 자신 팀 학생만 조회
 * - 학부모 정보 포함 (include)
 * - 페이지네이션 지원 (page/pageSize 없으면 전체 조회)
 */
export async function getStudentsAction(pagination?: {
  page?: number
  pageSize?: number
}): Promise<GetStudentsResult> {
  const session = await verifySession()

  if (!session) {
    return fail("인증되지 않은 요청입니다.")
  }

  try {
    // 역할별 학생 필터링: DIRECTOR는 전체, 나머지는 담당 학생만
    const where: Prisma.StudentWhereInput =
      session.role === "DIRECTOR" ? {} : { teacherId: session.userId }

    const selectFields = {
      id: true,
      name: true,
      school: true,
      grade: true,
      parents: {
        select: {
          id: true,
          name: true,
          relation: true,
        },
      },
    } as const

    // 페이지네이션 파라미터가 없으면 기존 동작 유지
    if (!pagination) {
      const students = await db.student.findMany({
        where,
        select: selectFields,
        orderBy: { name: "asc" },
      })

      return ok({ data: students })
    }

    // 페이지네이션 적용
    const page = Math.max(1, Math.floor(pagination.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Math.floor(pagination.pageSize ?? 20)))
    const skip = (page - 1) * pageSize

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        select: selectFields,
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      db.student.count({ where }),
    ])

    return ok({
      data: students,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to get students')
    return fail("학생 목록 조회 중 오류가 발생했습니다.")
  }
}
