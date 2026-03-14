'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { admissionCutoffSchema } from '@/lib/validations/admission'
import {
  upsertCutoff,
  getCutoffsByMajor,
  getCutoffTrend,
  deleteCutoff,
  verifyCutoff,
} from '@/features/admission/repositories/cutoff'
import { logger } from '@/lib/logger'

export async function addCutoffAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof upsertCutoff>>>> {
  try {
    await getCurrentTeacher()
    const parsed = admissionCutoffSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await upsertCutoff(parsed.data)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to add cutoff')
    return fail('커트라인 등록에 실패했습니다.')
  }
}

export async function getCutoffsAction(
  universityMajorId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCutoffsByMajor>>>> {
  try {
    await getCurrentTeacher()
    const result = await getCutoffsByMajor(universityMajorId)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cutoffs')
    return fail('커트라인 조회에 실패했습니다.')
  }
}

export async function getCutoffTrendAction(
  universityMajorId: string,
  admissionType: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCutoffTrend>>>> {
  try {
    await getCurrentTeacher()
    const result = await getCutoffTrend(universityMajorId, admissionType)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cutoff trend')
    return fail('커트라인 추세 조회에 실패했습니다.')
  }
}

export async function deleteCutoffAction(id: string): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher()
    await deleteCutoff(id)
    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete cutoff')
    return fail('커트라인 삭제에 실패했습니다.')
  }
}

export async function verifyCutoffAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof verifyCutoff>>>> {
  try {
    await getCurrentTeacher()
    const result = await verifyCutoff(id)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to verify cutoff')
    return fail('커트라인 검증에 실패했습니다.')
  }
}
