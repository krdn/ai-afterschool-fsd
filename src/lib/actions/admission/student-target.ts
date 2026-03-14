'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { studentTargetSchema } from '@/lib/validations/admission'
import {
  setTarget,
  getStudentTargets,
  removeTarget,
  updateTargetStatus,
} from '@/features/admission/repositories/student-target'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

export async function setTargetAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof setTarget>>>> {
  try {
    await getCurrentTeacher()
    const parsed = studentTargetSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await setTarget(parsed.data)
    revalidatePath('/admission/targets')
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to set target')
    return fail('목표 대학 설정에 실패했습니다.')
  }
}

export async function getStudentTargetsAction(
  studentId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getStudentTargets>>>> {
  try {
    await getCurrentTeacher()
    const result = await getStudentTargets(studentId)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get student targets')
    return fail('목표 대학 조회에 실패했습니다.')
  }
}

export async function removeTargetAction(
  studentId: string,
  universityMajorId: string,
): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher()
    await removeTarget(studentId, universityMajorId)
    revalidatePath('/admission/targets')
    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove target')
    return fail('목표 대학 삭제에 실패했습니다.')
  }
}

export async function updateTargetStatusAction(
  id: string,
  status: string,
): Promise<ActionResult<Awaited<ReturnType<typeof updateTargetStatus>>>> {
  try {
    await getCurrentTeacher()
    const result = await updateTargetStatus(id, status)
    revalidatePath('/admission/targets')
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update target status')
    return fail('목표 상태 변경에 실패했습니다.')
  }
}
