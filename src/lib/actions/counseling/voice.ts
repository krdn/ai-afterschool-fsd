"use server"

import { z } from "zod"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"
import {
  uploadAudio,
  getTranscript,
  getAnalysis,
  getNoteStatus,
  type TranscriptResponse,
  type AnalysisResponse,
} from "@/features/counseling/services/voice-api"

const MAX_AUDIO_SIZE = 100 * 1024 * 1024 // 100MB

const uploadParamsSchema = z.object({
  sessionId: z.string().cuid("세션 ID 형식이 올바르지 않습니다."),
})

// ---------------------------------------------------------------------------
// uploadCounselingAudioAction — 상담 녹음 업로드
// ---------------------------------------------------------------------------

type UploadAudioResult = {
  noteId: string
}

export async function uploadCounselingAudioAction(
  formData: FormData
): Promise<ActionResult<UploadAudioResult>> {
  const session = await verifySession()
  if (!session) return fail("인증되지 않은 요청입니다.")

  const parsed = uploadParamsSchema.safeParse({
    sessionId: formData.get("sessionId"),
  })
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.")
  }

  const { sessionId } = parsed.data
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return fail("파일이 없습니다.")
  if (file.size > MAX_AUDIO_SIZE) return fail("파일 크기는 100MB 이하여야 합니다.")
  if (!file.type.startsWith("audio/")) return fail("오디오 파일만 업로드할 수 있습니다.")

  try {
    const counselingSession = await db.counselingSession.findFirst({
      where: { id: sessionId, teacherId: session.userId },
    })
    if (!counselingSession) return fail("상담 세션을 찾을 수 없습니다.")

    const voiceNote = await uploadAudio(file, `상담녹음_${sessionId}`)

    await db.counselingSession.update({
      where: { id: sessionId },
      data: {
        audioNoteId: voiceNote.id,
        audioStatus: "processing",
      },
    })

    return ok({ noteId: voiceNote.id })
  } catch (error) {
    logger.error({ err: error }, "Failed to upload counseling audio")
    return fail(error instanceof Error ? error.message : "음성 업로드 중 오류가 발생했습니다.")
  }
}

// ---------------------------------------------------------------------------
// getCounselingTranscriptAction — STT 결과 조회 + DB 캐시
// ---------------------------------------------------------------------------

type TranscriptResult = {
  transcript: TranscriptResponse
  analysis: AnalysisResponse | null
}

export async function getCounselingTranscriptAction(
  sessionId: string
): Promise<ActionResult<TranscriptResult>> {
  const session = await verifySession()
  if (!session) return fail("인증되지 않은 요청입니다.")

  try {
    const counselingSession = await db.counselingSession.findFirst({
      where: { id: sessionId, teacherId: session.userId },
    })
    if (!counselingSession) return fail("상담 세션을 찾을 수 없습니다.")
    if (!counselingSession.audioNoteId) return fail("음성 녹음이 없습니다.")

    const noteId = counselingSession.audioNoteId

    const transcript = await getTranscript(noteId)

    let analysis: AnalysisResponse | null = null
    try {
      analysis = await getAnalysis(noteId)
    } catch {
      logger.warn("AI analysis not ready yet for note %s", noteId)
    }

    await db.counselingSession.update({
      where: { id: sessionId },
      data: {
        transcriptText: transcript.full_text,
        audioStatus: "completed",
      },
    })

    return ok({ transcript, analysis })
  } catch (error) {
    logger.error({ err: error }, "Failed to get counseling transcript")
    return fail("STT 결과 조회 중 오류가 발생했습니다.")
  }
}

// ---------------------------------------------------------------------------
// pollAudioStatusAction — 처리 상태 확인 (polling 폴백)
// ---------------------------------------------------------------------------

type AudioStatusResult = {
  status: string
}

export async function pollAudioStatusAction(
  sessionId: string
): Promise<ActionResult<AudioStatusResult>> {
  const session = await verifySession()
  if (!session) return fail("인증되지 않은 요청입니다.")

  try {
    const counselingSession = await db.counselingSession.findFirst({
      where: { id: sessionId, teacherId: session.userId },
    })
    if (!counselingSession) return fail("상담 세션을 찾을 수 없습니다.")
    if (!counselingSession.audioNoteId) return fail("음성 녹음이 없습니다.")

    const noteStatus = await getNoteStatus(counselingSession.audioNoteId)

    if (noteStatus.status !== counselingSession.audioStatus) {
      await db.counselingSession.update({
        where: { id: sessionId },
        data: { audioStatus: noteStatus.status },
      })
    }

    return ok({ status: noteStatus.status })
  } catch (error) {
    logger.error({ err: error }, "Failed to poll audio status")
    return fail("상태 확인 중 오류가 발생했습니다.")
  }
}
