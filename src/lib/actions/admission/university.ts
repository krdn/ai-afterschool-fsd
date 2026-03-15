'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { universitySchema } from '@/lib/validations/admission'
import {
  createUniversity,
  searchUniversities,
  getUniversityById,
  updateUniversity,
  listUniversities,
} from '@/features/admission/repositories/university'
import { logger } from '@/lib/logger'

export async function createUniversityAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createUniversity>>>> {
  try {
    const teacher = await getCurrentTeacher()
    const parsed = universitySchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await createUniversity({
      ...parsed.data,
      createdBy: teacher.id,
    })
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to create university')
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return fail('이미 등록된 대학입니다.')
    }
    return fail(error instanceof Error ? error.message : '대학 등록에 실패했습니다.')
  }
}

export async function searchUniversitiesAction(
  query: string,
): Promise<ActionResult<Awaited<ReturnType<typeof searchUniversities>>>> {
  try {
    await getCurrentTeacher()
    const results = await searchUniversities(query)
    return ok(results)
  } catch (error) {
    logger.error({ err: error }, 'Failed to search universities')
    return fail('대학 검색에 실패했습니다.')
  }
}

export async function getUniversityAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getUniversityById>>>> {
  try {
    await getCurrentTeacher()
    const result = await getUniversityById(id)
    if (!result) return fail('대학을 찾을 수 없습니다.')
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get university')
    return fail('대학 조회에 실패했습니다.')
  }
}

export async function updateUniversityAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateUniversity>>>> {
  try {
    await getCurrentTeacher()
    const parsed = universitySchema.partial().safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await updateUniversity(id, parsed.data)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update university')
    return fail('대학 수정에 실패했습니다.')
  }
}

export async function listUniversitiesAction(
  page = 1,
): Promise<ActionResult<Awaited<ReturnType<typeof listUniversities>>>> {
  try {
    await getCurrentTeacher()
    const result = await listUniversities(page)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to list universities')
    return fail('대학 목록 조회에 실패했습니다.')
  }
}
