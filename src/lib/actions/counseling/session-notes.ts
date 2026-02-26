'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { ok, okVoid, fail, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'
import {
  updateNoteSchema,
  addNoteSchema,
  deleteNoteSchema,
  reorderNotesSchema,
  type UpdateNoteInput,
  type AddNoteInput,
  type ReorderNotesInput,
} from '@/lib/validations/session-notes'

// ---------------------------------------------------------------------------
// updateNoteAction -- 노트 체크/메모 수정
// ---------------------------------------------------------------------------

/**
 * 노트의 checked 또는 memo를 수정한다.
 * 소유권 확인: note -> counselingSession.teacherId === userId
 */
export async function updateNoteAction(
  input: UpdateNoteInput
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const parsed = updateNoteSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.')
  }

  const { noteId, checked, memo } = parsed.data

  try {
    // 노트 조회 + 소유권 확인
    const note = await db.counselingNote.findUnique({
      where: { id: noteId },
      include: { counselingSession: { select: { teacherId: true } } },
    })

    if (!note) return fail('노트를 찾을 수 없습니다.')
    if (note.counselingSession.teacherId !== session.userId) {
      return fail('해당 노트에 대한 권한이 없습니다.')
    }

    // 업데이트할 데이터 구성
    const data: { checked?: boolean; memo?: string | null } = {}
    if (checked !== undefined) data.checked = checked
    if (memo !== undefined) data.memo = memo

    await db.counselingNote.update({
      where: { id: noteId },
      data,
    })

    revalidatePath('/counseling')

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to update counseling note')
    return fail('노트 수정 중 오류가 발생했습니다.')
  }
}

// ---------------------------------------------------------------------------
// addNoteAction -- 수동 노트 추가
// ---------------------------------------------------------------------------

/**
 * 세션에 새 노트를 추가한다.
 * 소유권 확인: counselingSession.teacherId === userId
 * source: 'MANUAL', order: 기존 최대값 + 1
 */
export async function addNoteAction(
  input: AddNoteInput
): Promise<ActionResult<{ noteId: string }>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const parsed = addNoteSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.')
  }

  const { sessionId, content } = parsed.data

  try {
    // 세션 소유권 확인
    const counselingSession = await db.counselingSession.findUnique({
      where: { id: sessionId },
      select: { teacherId: true },
    })

    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')
    if (counselingSession.teacherId !== session.userId) {
      return fail('해당 세션에 대한 권한이 없습니다.')
    }

    // 최대 order 조회
    const maxOrder = await db.counselingNote.aggregate({
      where: { counselingSessionId: sessionId },
      _max: { order: true },
    })

    const nextOrder = (maxOrder._max.order ?? -1) + 1

    // 노트 생성
    const note = await db.counselingNote.create({
      data: {
        counselingSessionId: sessionId,
        content,
        order: nextOrder,
        source: 'MANUAL',
      },
    })

    revalidatePath('/counseling')

    return ok({ noteId: note.id })
  } catch (error) {
    logger.error({ err: error }, 'Failed to add counseling note')
    return fail('노트 추가 중 오류가 발생했습니다.')
  }
}

// ---------------------------------------------------------------------------
// deleteNoteAction -- 노트 삭제
// ---------------------------------------------------------------------------

/**
 * 노트를 삭제한다.
 * 소유권 확인: note -> counselingSession.teacherId === userId
 */
export async function deleteNoteAction(
  noteId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const parsed = deleteNoteSchema.safeParse({ noteId })
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.')
  }

  try {
    // 노트 조회 + 소유권 확인
    const note = await db.counselingNote.findUnique({
      where: { id: noteId },
      include: { counselingSession: { select: { teacherId: true } } },
    })

    if (!note) return fail('노트를 찾을 수 없습니다.')
    if (note.counselingSession.teacherId !== session.userId) {
      return fail('해당 노트에 대한 권한이 없습니다.')
    }

    await db.counselingNote.delete({
      where: { id: noteId },
    })

    revalidatePath('/counseling')

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete counseling note')
    return fail('노트 삭제 중 오류가 발생했습니다.')
  }
}

// ---------------------------------------------------------------------------
// reorderNotesAction -- 노트 순서 변경
// ---------------------------------------------------------------------------

/**
 * 세션 내 노트들의 순서를 재정렬한다.
 * noteIds 배열의 인덱스가 새 order 값이 된다.
 * 소유권 확인: counselingSession.teacherId === userId
 */
export async function reorderNotesAction(
  input: ReorderNotesInput
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const parsed = reorderNotesSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.')
  }

  const { sessionId, noteIds } = parsed.data

  try {
    // 세션 소유권 확인
    const counselingSession = await db.counselingSession.findUnique({
      where: { id: sessionId },
      select: { teacherId: true },
    })

    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')
    if (counselingSession.teacherId !== session.userId) {
      return fail('해당 세션에 대한 권한이 없습니다.')
    }

    // 트랜잭션으로 모든 노트의 order를 인덱스로 업데이트
    await db.$transaction(
      noteIds.map((id, index) =>
        db.counselingNote.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    revalidatePath('/counseling')

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to reorder counseling notes')
    return fail('노트 순서 변경 중 오류가 발생했습니다.')
  }
}
