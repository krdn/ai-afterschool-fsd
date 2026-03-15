'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import {
  dataSourceRegistry,
  getAdmissionQuotaSource,
  getMajorInfoSource,
  DATA_SOURCE_CONFIGS,
} from '@/features/admission/datasources'
import { createUniversity, findUniversityByName } from '@/features/admission/repositories/university'
import { createMajor, findMajorByName } from '@/features/admission/repositories/university-major'
import { createSync, updateSyncStatus } from '@/features/admission/repositories/data-sync'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { PublicAdmissionQuota, PublicMajorInfo } from '@/features/admission/datasources/types'

/**
 * 공공 API 데이터 소스 상태 확인
 */
export async function getDataSourceStatusAction(): Promise<
  ActionResult<{ type: string; name: string; enabled: boolean; hasApiKey: boolean }[]>
> {
  try {
    await getCurrentTeacher()
    dataSourceRegistry.ensureInitialized()
    const status = dataSourceRegistry.getStatus()
    return ok(status)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get data source status')
    return fail('데이터 소스 상태 확인에 실패했습니다.')
  }
}

/**
 * 공공 API 연결 테스트
 */
export async function testDataSourcesAction(): Promise<
  ActionResult<{ type: string; name: string; connected: boolean; error?: string }[]>
> {
  try {
    await getCurrentTeacher()
    const results = await dataSourceRegistry.testAll()
    return ok(results)
  } catch (error) {
    logger.error({ err: error }, 'Failed to test data sources')
    return fail('데이터 소스 연결 테스트에 실패했습니다.')
  }
}

/**
 * 공공데이터에서 대학 입학정원 정보 수집
 */
export async function fetchAdmissionQuotaAction(
  universityName: string,
  year?: number,
): Promise<ActionResult<PublicAdmissionQuota[]>> {
  try {
    const teacher = await getCurrentTeacher()

    const sync = await createSync({
      syncType: 'MANUAL',
      targetQuery: `입학정원: ${universityName} ${year ?? ''}`.trim(),
      teacherId: teacher.id,
      status: 'PENDING',
    })

    const source = getAdmissionQuotaSource()
    const result = await source.searchByUniversity(universityName, { year })

    if (!result.success || !result.data) {
      await updateSyncStatus(sync.id, 'FAILED', {
        errorLog: result.error ?? '데이터 없음',
      })
      return fail(result.error ?? '입학정원 정보를 가져올 수 없습니다.')
    }

    await updateSyncStatus(sync.id, 'APPROVED', {
      recordsFound: result.totalCount,
      recordsSaved: result.data.length,
      source: 'data.go.kr 전국대학별입학정원정보',
    })

    return ok(result.data)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch admission quota')
    return fail(error instanceof Error ? error.message : '입학정원 정보 수집에 실패했습니다.')
  }
}

/**
 * 공공데이터에서 대학 학과 정보 수집 + DB 자동 저장
 */
export async function fetchAndSaveMajorInfoAction(
  universityName: string,
  year?: number,
): Promise<ActionResult<{ universityId: string; majorsCount: number }>> {
  try {
    const teacher = await getCurrentTeacher()

    const sync = await createSync({
      syncType: 'MANUAL',
      targetQuery: `학과정보: ${universityName} ${year ?? ''}`.trim(),
      teacherId: teacher.id,
      status: 'PENDING',
    })

    const source = getMajorInfoSource()
    const result = await source.searchByUniversity(universityName, { year })

    if (!result.success || !result.data || result.data.length === 0) {
      await updateSyncStatus(sync.id, 'FAILED', {
        errorLog: result.error ?? '데이터 없음',
      })
      return fail(result.error ?? `${universityName}의 학과 정보를 찾을 수 없습니다.`)
    }

    // 대학명 정규화
    const normalizedName = universityName.endsWith('대학교')
      ? universityName
      : universityName.endsWith('대학')
        ? universityName
        : `${universityName}대학교`

    // 대학 찾기 또는 생성
    const existing = await findUniversityByName(normalizedName)
    const universityId = existing?.id ?? (await createUniversity({
      name: normalizedName,
      type: 'FOUR_YEAR',
      region: '',
      createdBy: teacher.id,
      dataSource: 'data.go.kr 대학별학과정보',
    })).id

    // 학과 정보 저장
    let savedCount = 0
    for (const majorInfo of result.data) {
      const existingMajor = await findMajorByName(universityId, majorInfo.majorName)
      if (!existingMajor) {
        await createMajor({
          universityId,
          majorName: majorInfo.majorName,
          department: majorInfo.department,
          requiredSubjects: [],
          notes: [
            majorInfo.collegeName ? `단과대학: ${majorInfo.collegeName}` : null,
            majorInfo.degreeType ? `학위: ${majorInfo.degreeType}` : null,
            majorInfo.studyYears ? `수업연한: ${majorInfo.studyYears}년` : null,
            majorInfo.relatedJobs ? `관련직업: ${majorInfo.relatedJobs}` : null,
          ].filter(Boolean).join('\n'),
        })
        savedCount++
      }
    }

    await updateSyncStatus(sync.id, 'APPROVED', {
      recordsFound: result.totalCount,
      recordsSaved: savedCount,
      source: 'data.go.kr 대학별학과정보',
    })

    revalidatePath('/admission')
    return ok({ universityId, majorsCount: savedCount })
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch and save major info')
    return fail(error instanceof Error ? error.message : '학과 정보 수집에 실패했습니다.')
  }
}
