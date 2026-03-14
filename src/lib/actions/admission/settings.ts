'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { admissionSettingsSchema } from '@/lib/validations/admission'
import { db } from '@/lib/db/client'
import { DEFAULT_ADMISSION_SETTINGS, type AdmissionSettings } from '@/features/admission/types'
import { logger } from '@/lib/logger'

export async function getAdmissionSettingsAction(): Promise<ActionResult<AdmissionSettings>> {
  try {
    const teacher = await getCurrentTeacher()
    const prefs = (teacher.preferences as Record<string, unknown>) ?? {}
    const settings = { ...DEFAULT_ADMISSION_SETTINGS, ...(prefs.admission as Partial<AdmissionSettings> ?? {}) }
    return ok(settings)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get admission settings')
    return fail('설정 조회에 실패했습니다.')
  }
}

export async function updateAdmissionSettingsAction(
  input: unknown,
): Promise<ActionResult<AdmissionSettings>> {
  try {
    const teacher = await getCurrentTeacher()
    const parsed = admissionSettingsSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '설정 값이 올바르지 않습니다.')
    }
    const currentPrefs = (teacher.preferences as Record<string, unknown>) ?? {}
    await db.teacher.update({
      where: { id: teacher.id },
      data: {
        preferences: { ...currentPrefs, admission: parsed.data },
      },
    })
    return ok(parsed.data)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update admission settings')
    return fail('설정 저장에 실패했습니다.')
  }
}
