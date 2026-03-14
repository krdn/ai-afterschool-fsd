'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { aiResearchQuerySchema } from '@/lib/validations/admission'
import { researchUniversity } from '@/features/admission/services/ai-researcher'
import { getSyncById, updateSyncStatus } from '@/features/admission/repositories/data-sync'
import { createUniversity, findUniversityByName } from '@/features/admission/repositories/university'
import { createMajor, findMajorByName } from '@/features/admission/repositories/university-major'
import { upsertCutoff } from '@/features/admission/repositories/cutoff'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { AIResearchResult } from '@/features/admission/types'

export async function requestResearchAction(
  input: unknown,
): Promise<ActionResult<{ syncId: string; result: AIResearchResult | null; error?: string }>> {
  try {
    const teacher = await getCurrentTeacher()
    const parsed = aiResearchQuerySchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '검색어를 입력해주세요.')
    }
    const result = await researchUniversity(
      teacher.id,
      parsed.data.universityName,
      parsed.data.majorName,
      parsed.data.academicYear,
    )
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to request research')
    return fail('AI 수집 요청에 실패했습니다.')
  }
}

export async function approveResearchAction(
  syncId: string,
  editedResult?: AIResearchResult,
): Promise<ActionResult<{ universityId: string }>> {
  try {
    const teacher = await getCurrentTeacher()
    const sync = await getSyncById(syncId)
    if (!sync || sync.status !== 'REVIEW') {
      return fail('검토 가능한 수집 결과가 없습니다.')
    }

    const data = (editedResult ?? sync.resultData) as unknown as AIResearchResult
    if (!data?.university) return fail('수집 데이터가 올바르지 않습니다.')

    const normalizedName = data.university.name.endsWith('대학교')
      ? data.university.name
      : `${data.university.name}대학교`

    let university = await findUniversityByName(normalizedName)
    if (!university) {
      university = await createUniversity({
        name: normalizedName,
        nameShort: data.university.nameShort,
        type: data.university.type,
        region: data.university.region,
        website: data.university.website,
        createdBy: teacher.id,
        dataSource: sync.source,
      })
    }

    let savedCount = 0
    for (const majorData of data.majors) {
      let major = await findMajorByName(university.id, majorData.majorName)
      if (!major) {
        major = await createMajor({
          universityId: university.id,
          majorName: majorData.majorName,
          department: majorData.department,
          requiredSubjects: majorData.requiredSubjects,
          preparationGuide: majorData.preparationGuide,
        })
      }

      for (const cutoff of majorData.cutoffs) {
        await upsertCutoff({
          universityMajorId: major.id,
          academicYear: cutoff.academicYear,
          admissionType: cutoff.admissionType,
          cutoffGrade: cutoff.cutoffGrade,
          cutoffScore: cutoff.cutoffScore,
          cutoffPercentile: cutoff.cutoffPercentile,
          competitionRate: cutoff.competitionRate,
          enrollmentCount: cutoff.enrollmentCount,
          applicantCount: cutoff.applicantCount,
          additionalInfo: cutoff.additionalInfo,
          dataSource: sync.source,
          isVerified: true,
        })
        savedCount++
      }
    }

    await updateSyncStatus(syncId, 'APPROVED', { recordsSaved: savedCount })
    revalidatePath('/admission')
    return ok({ universityId: university.id })
  } catch (error) {
    logger.error({ err: error }, 'Failed to approve research')
    return fail('수집 결과 승인에 실패했습니다.')
  }
}

export async function rejectResearchAction(syncId: string): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher()
    await updateSyncStatus(syncId, 'REJECTED')
    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to reject research')
    return fail('수집 결과 거부에 실패했습니다.')
  }
}
