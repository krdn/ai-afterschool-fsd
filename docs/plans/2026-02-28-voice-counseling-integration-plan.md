# 상담 음성 녹음/STT/AI 요약 통합 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** voice-recognition 서비스의 녹음/STT/AI 요약 기능을 상담 세션 라이브 페이지에 통합하여 교사가 상담 중 녹음하고 상담 완료 시 자동으로 상담 내용을 채울 수 있도록 한다.

**Architecture:** ai-afterschool-fsd 프론트엔드에서 브라우저 MediaRecorder로 녹음한 후, Server Action을 통해 voice-recognition 외부 API에 업로드한다. WebSocket으로 STT 진행률을 실시간 수신하고, 완료 시 요약 결과를 상담 완료 폼에 자동 반영한다.

**Tech Stack:** Next.js 15 (Server Actions), MediaRecorder API (webm/opus), WebSocket, voice-recognition FastAPI (WhisperX + Ollama), Prisma, shadcn/ui

**Design Doc:** `docs/plans/2026-02-28-voice-counseling-integration-design.md`

---

## Task 1: voice-recognition에 서비스 간 API Key 인증 추가

> **프로젝트**: `/home/gon/projects/ai/voice-recognition`

**Files:**
- Modify: `/home/gon/projects/ai/voice-recognition/backend/app/core/config.py`
- Modify: `/home/gon/projects/ai/voice-recognition/backend/app/api/deps.py`
- Create: `/home/gon/projects/ai/voice-recognition/backend/app/api/routes/service.py`
- Modify: `/home/gon/projects/ai/voice-recognition/backend/app/main.py`
- Modify: `/home/gon/projects/ai/voice-recognition/.env.example`

**Step 1: config.py에 SERVICE_API_KEY 설정 추가**

`backend/app/core/config.py`에 추가:

```python
class Settings(BaseSettings):
    # ... 기존 필드 ...
    service_api_key: str = ""  # 서비스 간 통신용 API Key
```

**Step 2: deps.py에 API Key 검증 의존성 추가**

`backend/app/api/deps.py`에 추가:

```python
from fastapi import Header

async def verify_service_key(
    x_service_key: str = Header(..., alias="X-Service-Key"),
) -> None:
    """서비스 간 통신용 API Key 검증"""
    if not settings.service_api_key:
        raise HTTPException(status_code=500, detail="SERVICE_API_KEY가 설정되지 않았습니다")
    if x_service_key != settings.service_api_key:
        raise HTTPException(status_code=401, detail="유효하지 않은 서비스 키입니다")
```

**Step 3: service.py 라우터 생성**

`backend/app/api/routes/service.py` 생성 — 기존 `notes.py`의 `upload_note`, `get_transcript`, `get_analysis` 로직을 재사용하되 API Key 인증 적용:

```python
# backend/app/api/routes/service.py
import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import verify_service_key
from app.core.config import settings
from app.core.database import get_db
from app.models.note import Analysis, Note, Project, Transcript
from app.models.user import User
from app.schemas.note import AnalysisResponse, NoteResponse, TranscriptResponse
from app.services.queue import enqueue_job

router = APIRouter(prefix="/api/service", tags=["service"], dependencies=[Depends(verify_service_key)])

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac"}


@router.post("/upload", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def service_upload(
    file: UploadFile,
    title: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """서비스 간 오디오 업로드 (API Key 인증, 프로젝트/유저 없이 독립 노트 생성)"""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식입니다: {ext}")

    file_id = str(uuid.uuid4())
    file_path = os.path.join(settings.upload_dir, f"{file_id}{ext}")
    os.makedirs(settings.upload_dir, exist_ok=True)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # 서비스용 전용 프로젝트 조회 또는 생성
    result = await db.execute(select(Project).where(Project.name == "__service__"))
    project = result.scalar_one_or_none()

    if not project:
        # 서비스 전용 유저 조회 또는 생성
        user_result = await db.execute(select(User).where(User.email == "service@internal"))
        service_user = user_result.scalar_one_or_none()
        if not service_user:
            service_user = User(email="service@internal", username="service", password_hash="disabled")
            db.add(service_user)
            await db.flush()

        project = Project(user_id=service_user.id, name="__service__", description="서비스 간 통신용 프로젝트")
        db.add(project)
        await db.flush()

    note = Note(
        project_id=project.id,
        title=title or file.filename or "상담 녹음",
        audio_path=file_path,
        status="queued",
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    await enqueue_job(str(note.id), file_path)

    return note


@router.get("/notes/{note_id}/transcript", response_model=TranscriptResponse)
async def service_get_transcript(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """서비스용 트랜스크립트 조회 (API Key 인증)"""
    result = await db.execute(select(Transcript).where(Transcript.note_id == note_id))
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="트랜스크립트를 찾을 수 없습니다")
    return transcript


@router.get("/notes/{note_id}/analysis", response_model=AnalysisResponse)
async def service_get_analysis(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """서비스용 분석 결과 조회 (API Key 인증)"""
    result = await db.execute(select(Analysis).where(Analysis.note_id == note_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
    return analysis


@router.get("/notes/{note_id}/status")
async def service_get_status(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """노트 처리 상태 조회 (polling 폴백용)"""
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다")
    return {"id": str(note.id), "status": note.status}
```

**Step 4: main.py에 service 라우터 등록**

`backend/app/main.py`에 추가:

```python
from app.api.routes.service import router as service_router
# ...
app.include_router(service_router)
```

**Step 5: .env.example에 SERVICE_API_KEY 추가**

```
# 서비스 간 통신 (ai-afterschool-fsd 연동)
SERVICE_API_KEY=change-this-to-a-random-api-key
```

**Step 6: .env에 실제 키 설정 및 테스트**

```bash
cd /home/gon/projects/ai/voice-recognition
# .env에 SERVICE_API_KEY 설정
# curl로 테스트:
# curl -X GET http://localhost:8200/api/service/notes/xxx/status -H "X-Service-Key: <KEY>"
```

**Step 7: 커밋**

```bash
cd /home/gon/projects/ai/voice-recognition
git add backend/app/core/config.py backend/app/api/deps.py backend/app/api/routes/service.py backend/app/main.py .env.example
git commit -m "feat: 서비스 간 API Key 인증 엔드포인트 추가"
```

---

## Task 2: Prisma 스키마에 음성 녹음 필드 추가

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Modify: `prisma/schema.prisma` (CounselingSession 모델, 약 396행)

**Step 1: CounselingSession 모델에 3개 필드 추가**

`prisma/schema.prisma`의 `CounselingSession` 모델 (`@@index` 앞)에 추가:

```prisma
  // 음성 녹음 관련
  audioNoteId      String?   // voice-recognition의 note UUID
  audioStatus      String?   // uploading|processing|completed|failed
  transcriptText   String?   @db.Text  // STT 전체 텍스트 (캐시)
```

**Step 2: DB에 반영**

```bash
cd /home/gon/projects/ai/ai-afterschool-fsd
pnpm db:push
pnpm db:generate
```

Expected: `Your database is now in sync with your Prisma schema.`

**Step 3: 커밋**

```bash
git add prisma/schema.prisma
git commit -m "feat: CounselingSession에 음성 녹음 필드 추가 (audioNoteId, audioStatus, transcriptText)"
```

---

## Task 3: 환경변수 및 voice-recognition API 클라이언트

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Modify: `.env.example`
- Create: `src/features/counseling/services/voice-api.ts`

**Step 1: .env.example에 VOICE_ 환경변수 추가**

`.env.example` 파일 끝에 추가:

```env
# =============================================================================
# Voice Recognition Service (상담 녹음 STT)
# =============================================================================
# voice-recognition API 서버 URL (내부망)
VOICE_API_URL=http://192.168.0.5:8200

# voice-recognition 서비스 API Key (SERVICE_API_KEY와 동일한 값)
VOICE_API_KEY=change-this-to-match-voice-recognition-service-api-key

# voice-recognition WebSocket URL (프론트엔드에서 직접 접속)
NEXT_PUBLIC_VOICE_WS_URL=ws://192.168.0.5:8200
```

**Step 2: .env.local에도 실제 값 설정 (수동)**

**Step 3: voice-api.ts 생성**

`src/features/counseling/services/voice-api.ts`:

```typescript
/**
 * voice-recognition API 클라이언트
 *
 * 서버 사이드 전용 (Server Action에서 호출).
 * 환경변수: VOICE_API_URL, VOICE_API_KEY
 */

const VOICE_API_URL = process.env.VOICE_API_URL || 'http://192.168.0.5:8200'
const VOICE_API_KEY = process.env.VOICE_API_KEY || ''

type VoiceNoteResponse = {
  id: string
  title: string
  status: string
}

type TranscriptSegment = {
  speaker: string
  start: number
  end: number
  text: string
  confidence: number | null
}

type TranscriptResponse = {
  segments: TranscriptSegment[]
  full_text: string
  language: string
}

type AnalysisResponse = {
  summary: string | null
  topics: string[]
  keywords: string[]
  action_items: { text: string; assignee: string | null; deadline: string | null }[]
}

type NoteStatusResponse = {
  id: string
  status: string
}

async function voiceFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${VOICE_API_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'X-Service-Key': VOICE_API_KEY,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`voice-recognition API 오류 (${res.status}): ${detail}`)
  }

  return res.json() as Promise<T>
}

/** 오디오 파일 업로드 → note ID 반환 */
export async function uploadAudio(file: File, title?: string): Promise<VoiceNoteResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)

  const url = `${VOICE_API_URL}/api/service/upload`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Service-Key': VOICE_API_KEY },
    body: formData,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`업로드 오류 (${res.status}): ${detail}`)
  }

  return res.json() as Promise<VoiceNoteResponse>
}

/** 트랜스크립트 조회 */
export async function getTranscript(noteId: string): Promise<TranscriptResponse> {
  return voiceFetch<TranscriptResponse>(`/api/service/notes/${noteId}/transcript`)
}

/** AI 분석 결과 조회 */
export async function getAnalysis(noteId: string): Promise<AnalysisResponse> {
  return voiceFetch<AnalysisResponse>(`/api/service/notes/${noteId}/analysis`)
}

/** 노트 처리 상태 조회 (polling 폴백용) */
export async function getNoteStatus(noteId: string): Promise<NoteStatusResponse> {
  return voiceFetch<NoteStatusResponse>(`/api/service/notes/${noteId}/status`)
}

export type { VoiceNoteResponse, TranscriptResponse, TranscriptSegment, AnalysisResponse, NoteStatusResponse }
```

**Step 4: 커밋**

```bash
git add .env.example src/features/counseling/services/voice-api.ts
git commit -m "feat: voice-recognition API 클라이언트 및 환경변수 추가"
```

---

## Task 4: Server Actions — 음성 업로드/결과 조회

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Create: `src/lib/actions/counseling/voice.ts`

**Step 1: voice.ts Server Actions 생성**

`src/lib/actions/counseling/voice.ts`:

```typescript
'use server'

import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'
import {
  uploadAudio,
  getTranscript,
  getAnalysis,
  getNoteStatus,
  type TranscriptResponse,
  type AnalysisResponse,
} from '@/features/counseling/services/voice-api'

// ---------------------------------------------------------------------------
// uploadCounselingAudioAction — 상담 녹음 업로드
// ---------------------------------------------------------------------------

type UploadAudioResult = {
  noteId: string
}

/**
 * 상담 녹음 파일을 voice-recognition 서비스에 업로드하고
 * CounselingSession에 audioNoteId를 저장한다.
 */
export async function uploadCounselingAudioAction(
  formData: FormData
): Promise<ActionResult<UploadAudioResult>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const sessionId = formData.get('sessionId') as string
  const file = formData.get('file') as File

  if (!sessionId || !file) {
    return fail('필수 파라미터가 누락되었습니다.')
  }

  try {
    // 세션 소유권 확인
    const counselingSession = await db.counselingSession.findFirst({
      where: { id: sessionId, teacherId: session.userId },
    })
    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')

    // voice-recognition API에 업로드
    const voiceNote = await uploadAudio(file, `상담녹음_${sessionId}`)

    // CounselingSession에 audioNoteId 저장
    await db.counselingSession.update({
      where: { id: sessionId },
      data: {
        audioNoteId: voiceNote.id,
        audioStatus: 'processing',
      },
    })

    return ok({ noteId: voiceNote.id })
  } catch (error) {
    logger.error({ err: error }, 'Failed to upload counseling audio')
    return fail(
      error instanceof Error
        ? error.message
        : '음성 업로드 중 오류가 발생했습니다.'
    )
  }
}

// ---------------------------------------------------------------------------
// getCounselingTranscriptAction — STT 결과 조회 + DB 캐시
// ---------------------------------------------------------------------------

type TranscriptResult = {
  transcript: TranscriptResponse
  analysis: AnalysisResponse | null
}

/**
 * voice-recognition에서 STT 결과와 AI 분석을 조회하고
 * CounselingSession에 캐시한다.
 */
export async function getCounselingTranscriptAction(
  sessionId: string
): Promise<ActionResult<TranscriptResult>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  try {
    const counselingSession = await db.counselingSession.findFirst({
      where: { id: sessionId, teacherId: session.userId },
    })
    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')
    if (!counselingSession.audioNoteId) return fail('음성 녹음이 없습니다.')

    const noteId = counselingSession.audioNoteId

    // 트랜스크립트 조회
    const transcript = await getTranscript(noteId)

    // 분석 결과 조회 (실패해도 트랜스크립트는 반환)
    let analysis: AnalysisResponse | null = null
    try {
      analysis = await getAnalysis(noteId)
    } catch {
      logger.warn('AI analysis not ready yet for note %s', noteId)
    }

    // DB에 캐시
    await db.counselingSession.update({
      where: { id: sessionId },
      data: {
        transcriptText: transcript.full_text,
        audioStatus: 'completed',
      },
    })

    return ok({ transcript, analysis })
  } catch (error) {
    logger.error({ err: error }, 'Failed to get counseling transcript')
    return fail('STT 결과 조회 중 오류가 발생했습니다.')
  }
}

// ---------------------------------------------------------------------------
// pollAudioStatusAction — 처리 상태 확인 (polling 폴백)
// ---------------------------------------------------------------------------

type AudioStatusResult = {
  status: string
}

/**
 * voice-recognition의 노트 처리 상태를 확인한다.
 * WebSocket 끊김 시 polling 폴백으로 사용.
 */
export async function pollAudioStatusAction(
  sessionId: string
): Promise<ActionResult<AudioStatusResult>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  try {
    const counselingSession = await db.counselingSession.findFirst({
      where: { id: sessionId, teacherId: session.userId },
    })
    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')
    if (!counselingSession.audioNoteId) return fail('음성 녹음이 없습니다.')

    const noteStatus = await getNoteStatus(counselingSession.audioNoteId)

    // DB 상태도 업데이트
    if (noteStatus.status !== counselingSession.audioStatus) {
      await db.counselingSession.update({
        where: { id: sessionId },
        data: { audioStatus: noteStatus.status },
      })
    }

    return ok({ status: noteStatus.status })
  } catch (error) {
    logger.error({ err: error }, 'Failed to poll audio status')
    return fail('상태 확인 중 오류가 발생했습니다.')
  }
}
```

**Step 2: 커밋**

```bash
git add src/lib/actions/counseling/voice.ts
git commit -m "feat: 상담 음성 업로드/결과 조회 Server Actions 추가"
```

---

## Task 5: useAudioRecorder Hook 포팅

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Create: `src/hooks/use-audio-recorder.ts`

**Step 1: voice-recognition의 useAudioRecorder를 포팅**

`src/hooks/use-audio-recorder.ts` — voice-recognition의 `frontend/src/hooks/useAudioRecorder.ts`와 동일한 로직이지만, 프로젝트 컨벤션(kebab-case 파일명)에 맞춰 복사:

```typescript
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'paused'

type UseAudioRecorderReturn = {
  status: RecorderStatus
  /** 녹음 시간 (초) */
  duration: number
  /** 녹음 완료된 Blob */
  audioBlob: Blob | null
  /** 미리듣기용 URL */
  audioUrl: string | null
  /** 에러 메시지 */
  error: string | null
  start: () => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  /** 녹음 결과 초기화 (재녹음) */
  reset: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      stopStream()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!window.isSecureContext) {
        setError('마이크 녹음은 HTTPS 환경에서만 사용할 수 있습니다. HTTPS로 접속하거나 localhost를 사용해주세요.')
      } else {
        setError('이 브라우저는 마이크 녹음을 지원하지 않습니다.')
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stopStream()
      }

      recorder.start(1000)
      setStatus('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      stopStream()
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.')
      } else {
        setError('마이크에 접근할 수 없습니다.')
      }
    }
  }, [stopStream])

  const stop = useCallback(() => {
    clearTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setStatus('idle')
  }, [clearTimer])

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      clearTimer()
      setStatus('paused')
    }
  }, [clearTimer])

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setStatus('recording')
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    stopStream()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    mediaRecorderRef.current = null
    chunksRef.current = []
    setStatus('idle')
    setDuration(0)
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
  }, [clearTimer, stopStream, audioUrl])

  return {
    status,
    duration,
    audioBlob,
    audioUrl,
    error,
    start,
    stop,
    pause,
    resume,
    reset,
  }
}
```

**Step 2: 커밋**

```bash
git add src/hooks/use-audio-recorder.ts
git commit -m "feat: useAudioRecorder Hook 추가 (MediaRecorder API 래퍼)"
```

---

## Task 6: useVoiceProcessing Hook

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Create: `src/hooks/use-voice-processing.ts`

**Step 1: Hook 생성**

`src/hooks/use-voice-processing.ts`:

```typescript
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  uploadCounselingAudioAction,
  getCounselingTranscriptAction,
  pollAudioStatusAction,
} from '@/lib/actions/counseling/voice'

type VoiceProcessingStatus = 'idle' | 'uploading' | 'stt' | 'analyzing' | 'completed' | 'failed'

type UseVoiceProcessingReturn = {
  uploadAudio: (blob: Blob, sessionId: string) => Promise<void>
  status: VoiceProcessingStatus
  progress: number
  transcript: string | null
  summary: string | null
  keywords: string[]
  error: string | null
  reset: () => void
}

const VOICE_WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://192.168.0.5:8200'

export function useVoiceProcessing(): UseVoiceProcessingReturn {
  const [status, setStatus] = useState<VoiceProcessingStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const reconnectCountRef = useRef(0)

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    reconnectCountRef.current = 0
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  /** 결과 조회 (STT + 분석) */
  const fetchResults = useCallback(async (sessionId: string) => {
    const result = await getCounselingTranscriptAction(sessionId)
    if (result.success) {
      setTranscript(result.data.transcript.full_text)
      if (result.data.analysis) {
        setSummary(result.data.analysis.summary)
        setKeywords(result.data.analysis.keywords)
      }
      setStatus('completed')
      setProgress(100)
    }
  }, [])

  /** polling 폴백 시작 */
  const startPolling = useCallback((sessionId: string) => {
    if (pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(async () => {
      const result = await pollAudioStatusAction(sessionId)
      if (result.success) {
        const noteStatus = result.data.status
        if (noteStatus === 'completed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          await fetchResults(sessionId)
        } else if (noteStatus === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setStatus('failed')
          setError('음성 처리에 실패했습니다.')
        }
      }
    }, 10000) // 10초 간격
  }, [fetchResults])

  /** WebSocket 연결 */
  const connectWebSocket = useCallback((noteId: string, sessionId: string) => {
    const ws = new WebSocket(`${VOICE_WS_URL}/ws/notes/${noteId}/status`)
    wsRef.current = ws

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data) as {
          note_id: string
          status: string
          progress: number
        }
        setProgress(data.progress)

        if (data.status === 'stt' || data.status === 'stt_done') {
          setStatus('stt')
        } else if (data.status === 'analyzing' || data.status === 'analyzing_done') {
          setStatus('analyzing')
        } else if (data.status === 'completed') {
          cleanup()
          await fetchResults(sessionId)
        } else if (data.status === 'failed') {
          cleanup()
          setStatus('failed')
          setError('음성 처리에 실패했습니다.')
        }
      } catch {
        // 파싱 실패 무시
      }
    }

    ws.onclose = () => {
      // 자동 재연결 (최대 3회), 이후 polling 폴백
      if (status !== 'completed' && status !== 'failed' && status !== 'idle') {
        if (reconnectCountRef.current < 3) {
          reconnectCountRef.current++
          setTimeout(() => connectWebSocket(noteId, sessionId), 2000)
        } else {
          startPolling(sessionId)
        }
      }
    }

    ws.onerror = () => {
      // onclose에서 처리
    }
  }, [status, cleanup, fetchResults, startPolling])

  /** 오디오 업로드 + 처리 시작 */
  const uploadAudio = useCallback(async (blob: Blob, sessionId: string) => {
    setError(null)
    setStatus('uploading')
    setProgress(5)
    sessionIdRef.current = sessionId

    try {
      const file = new File([blob], `counseling_${sessionId}.webm`, { type: blob.type })
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      formData.append('file', file)

      const result = await uploadCounselingAudioAction(formData)
      if (!result.success) {
        setStatus('failed')
        setError(result.error)
        return
      }

      setStatus('stt')
      setProgress(10)

      // WebSocket으로 진행률 추적
      connectWebSocket(result.data.noteId, sessionId)
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.')
    }
  }, [connectWebSocket])

  const reset = useCallback(() => {
    cleanup()
    setStatus('idle')
    setProgress(0)
    setTranscript(null)
    setSummary(null)
    setKeywords([])
    setError(null)
    sessionIdRef.current = null
  }, [cleanup])

  return {
    uploadAudio,
    status,
    progress,
    transcript,
    summary,
    keywords,
    error,
    reset,
  }
}
```

**Step 2: 커밋**

```bash
git add src/hooks/use-voice-processing.ts
git commit -m "feat: useVoiceProcessing Hook 추가 (WebSocket + polling 폴백)"
```

---

## Task 7: AudioRecorderPanel 컴포넌트

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Create: `src/components/counseling/session-live/audio-recorder-panel.tsx`

**Step 1: 녹음 + STT 진행률 통합 컴포넌트 생성**

`src/components/counseling/session-live/audio-recorder-panel.tsx`:

```typescript
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Mic, Pause, Square, Play, Upload, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useVoiceProcessing } from '@/hooks/use-voice-processing'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const STATUS_LABELS: Record<string, string> = {
  idle: '대기',
  uploading: '업로드 중...',
  stt: '음성 인식 중...',
  analyzing: 'AI 분석 중...',
  completed: '완료',
  failed: '실패',
}

type AudioRecorderPanelProps = {
  sessionId: string
  onSummaryReady?: (summary: string, keywords: string[]) => void
}

export function AudioRecorderPanel({ sessionId, onSummaryReady }: AudioRecorderPanelProps) {
  const recorder = useAudioRecorder()
  const voice = useVoiceProcessing()
  const audioRef = useRef<HTMLAudioElement>(null)
  const summaryNotifiedRef = useRef(false)

  // 요약 준비되면 부모에게 알림 (1회만)
  if (voice.status === 'completed' && voice.summary && !summaryNotifiedRef.current) {
    summaryNotifiedRef.current = true
    onSummaryReady?.(voice.summary, voice.keywords)
  }

  const handleConfirmRecording = async () => {
    if (!recorder.audioBlob) return
    await voice.uploadAudio(recorder.audioBlob, sessionId)
  }

  const handleReset = () => {
    recorder.reset()
    voice.reset()
    summaryNotifiedRef.current = false
  }

  // STT 처리 중 또는 완료된 상태
  if (voice.status !== 'idle') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4" />
            음성 처리
          </h4>
          <span className="text-xs text-muted-foreground">
            {STATUS_LABELS[voice.status] || voice.status}
          </span>
        </div>

        <Progress value={voice.progress} className="h-2" />

        {voice.status === 'completed' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>음성 인식 및 AI 분석이 완료되었습니다. 상담 완료 시 자동 반영됩니다.</span>
          </div>
        )}

        {voice.status === 'failed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{voice.error || '음성 처리에 실패했습니다.'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </div>
        )}
      </div>
    )
  }

  // 녹음 완료 후 미리듣기 상태
  if (recorder.audioBlob && recorder.audioUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            녹음 완료
          </h4>
          <span className="text-xs text-muted-foreground">{formatTime(recorder.duration)}</span>
        </div>

        <audio ref={audioRef} src={recorder.audioUrl} controls className="w-full h-8" />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
            <RotateCcw className="h-3 w-3 mr-1" />
            재녹음
          </Button>
          <Button size="sm" onClick={handleConfirmRecording} className="flex-1">
            <Upload className="h-3 w-3 mr-1" />
            음성 분석 시작
          </Button>
        </div>
      </div>
    )
  }

  // 녹음 대기/진행 중 상태
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          상담 녹음
        </h4>
        {recorder.status !== 'idle' && (
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(recorder.duration)}
          </span>
        )}
      </div>

      {recorder.error && (
        <p className="text-xs text-destructive">{recorder.error}</p>
      )}

      {recorder.status === 'recording' && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs text-muted-foreground">녹음 중...</span>
        </div>
      )}

      {recorder.status === 'paused' && (
        <p className="text-xs text-amber-600">일시정지됨</p>
      )}

      <div className="flex gap-2">
        {recorder.status === 'idle' && (
          <Button variant="outline" size="sm" onClick={recorder.start}>
            <Mic className="h-3 w-3 mr-1" />
            녹음 시작
          </Button>
        )}

        {recorder.status === 'recording' && (
          <>
            <Button variant="outline" size="sm" onClick={recorder.pause}>
              <Pause className="h-3 w-3 mr-1" />
              일시정지
            </Button>
            <Button variant="secondary" size="sm" onClick={recorder.stop}>
              <Square className="h-3 w-3 mr-1" />
              정지
            </Button>
          </>
        )}

        {recorder.status === 'paused' && (
          <>
            <Button variant="outline" size="sm" onClick={recorder.resume}>
              <Play className="h-3 w-3 mr-1" />
              계속
            </Button>
            <Button variant="secondary" size="sm" onClick={recorder.stop}>
              <Square className="h-3 w-3 mr-1" />
              정지
            </Button>
          </>
        )}
      </div>

      {recorder.status === 'idle' && (
        <p className="text-xs text-muted-foreground">
          녹음 버튼을 눌러 상담 내용을 녹음하세요. 녹음 후 자동으로 텍스트 변환 및 AI 요약이 진행됩니다.
        </p>
      )}
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add src/components/counseling/session-live/audio-recorder-panel.tsx
git commit -m "feat: AudioRecorderPanel 컴포넌트 추가 (녹음 + STT 진행률 통합)"
```

---

## Task 8: SessionLivePage 레이아웃 변경 (3분할)

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Modify: `src/components/counseling/session-live/session-live-page.tsx`

**Step 1: import 추가 및 상태 추가**

`session-live-page.tsx` 상단에 import 추가:

```typescript
import { AudioRecorderPanel } from './audio-recorder-panel'
```

`SessionLivePage` 컴포넌트 내부에 STT 요약 상태 추가:

```typescript
const [voiceSummary, setVoiceSummary] = useState<string | null>(null)
const [voiceKeywords, setVoiceKeywords] = useState<string[]>([])
```

**Step 2: recording Phase를 2분할 → 3분할로 변경**

기존 recording Phase의 `ResizablePanelGroup`을 수정:

- AI 참조 패널: `defaultSize={30}` `minSize={10}`
- 녹음 패널: `defaultSize={25}` `minSize={15}` (신규)
- 체크리스트: `defaultSize={45}` `minSize={15}`

새 녹음 패널 추가 (두 번째 ResizablePanel):

```tsx
<ResizableHandle withHandle />

{/* 중간: 녹음 패널 */}
<ResizablePanel defaultSize={25} minSize={15}>
  <div className="border rounded-lg p-4 h-full overflow-y-auto mt-1">
    {counselingSession ? (
      <AudioRecorderPanel
        sessionId={counselingSession.id}
        onSummaryReady={(summary, keywords) => {
          setVoiceSummary(summary)
          setVoiceKeywords(keywords)
        }}
      />
    ) : (
      <p className="text-sm text-muted-foreground">상담 세션이 없습니다.</p>
    )}
  </div>
</ResizablePanel>
```

**Step 3: completing Phase에 voiceSummary 전달**

`SessionCompleteForm`에 새 prop 추가:

```tsx
<SessionCompleteForm
  // ... 기존 props ...
  voiceSummary={voiceSummary}
  voiceKeywords={voiceKeywords}
/>
```

**Step 4: 커밋**

```bash
git add src/components/counseling/session-live/session-live-page.tsx
git commit -m "feat: SessionLivePage에 녹음 패널 추가 (3분할 레이아웃)"
```

---

## Task 9: SessionCompleteForm — 음성 요약 자동 반영

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Modify: `src/components/counseling/session-live/session-complete-form.tsx`

**Step 1: props에 voiceSummary, voiceKeywords 추가**

```typescript
interface SessionCompleteFormProps {
  // ... 기존 props ...
  voiceSummary?: string | null
  voiceKeywords?: string[]
}
```

**Step 2: summary 초기값 로직 변경**

기존 `buildSummaryFromNotes` 대신 voiceSummary 우선 사용:

```typescript
const [summary, setSummary] = useState(() => {
  if (voiceSummary) return voiceSummary
  return buildSummaryFromNotes(notes)
})
```

**Step 3: voiceSummary가 나중에 도착하는 경우 처리**

컴포넌트 내부에 useEffect 추가:

```typescript
// voiceSummary가 비동기로 도착하면 (아직 사용자가 수정하지 않은 경우) 반영
const [isUserEdited, setIsUserEdited] = useState(false)

useEffect(() => {
  if (voiceSummary && !isUserEdited) {
    setSummary(voiceSummary)
  }
}, [voiceSummary, isUserEdited])
```

Textarea의 onChange에서 `setIsUserEdited(true)` 추가.

**Step 4: 음성 요약 배지 표시**

summary Textarea 위에 voiceSummary 존재 시 배지 추가:

```tsx
{voiceSummary && (
  <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
    <Mic className="h-3 w-3" />
    AI 음성 요약이 적용되었습니다 (편집 가능)
  </div>
)}
```

**Step 5: 커밋**

```bash
git add src/components/counseling/session-live/session-complete-form.tsx
git commit -m "feat: 상담 완료 폼에 음성 요약 자동 반영 기능 추가"
```

---

## Task 10: SessionWithNotes 타입 업데이트

> **프로젝트**: `/home/gon/projects/ai/ai-afterschool-fsd`

**Files:**
- Modify: `src/lib/actions/counseling/session-live.ts`

**Step 1: SessionWithNotes 타입에 음성 필드 추가**

`counselingSession` 타입 내부에 추가:

```typescript
counselingSession: {
  // ... 기존 필드 ...
  audioNoteId: string | null
  audioStatus: string | null
  transcriptText: string | null
} | null
```

**Step 2: getSessionWithNotesAction 쿼리에 select 추가 (필요 시)**

Prisma include에 이미 `counselingSession` 전체가 포함되어 있으므로, 새 필드는 자동으로 반환됨. 타입 캐스팅만 업데이트.

**Step 3: 커밋**

```bash
git add src/lib/actions/counseling/session-live.ts
git commit -m "feat: SessionWithNotes 타입에 음성 녹음 필드 추가"
```

---

## Task 11: 타입체크 및 통합 테스트

**Step 1: 타입체크 실행**

```bash
cd /home/gon/projects/ai/ai-afterschool-fsd
pnpm typecheck
```

Expected: 에러 없이 통과

**Step 2: 린트 실행**

```bash
pnpm lint
```

Expected: 에러 없이 통과 (warning은 허용)

**Step 3: 빌드 테스트**

```bash
pnpm build
```

Expected: 빌드 성공

**Step 4: 모든 변경사항 최종 커밋**

타입체크/린트에서 수정이 필요했다면 해당 수정을 커밋:

```bash
git add -A
git commit -m "fix: 타입체크 및 린트 수정"
```

---

## 의존성 순서

```
Task 1 (voice-recognition API Key) ─┐
Task 2 (Prisma 스키마)              ─┤
Task 3 (환경변수 + API 클라이언트)    ─┼→ Task 4 (Server Actions)
                                     │
Task 5 (useAudioRecorder)           ─┤
                                     ↓
                                Task 6 (useVoiceProcessing)
                                     │
                                     ↓
                                Task 7 (AudioRecorderPanel)
                                     │
Task 10 (타입 업데이트)              ─┤
                                     ↓
                                Task 8 (SessionLivePage 변경)
                                     │
                                     ↓
                                Task 9 (SessionCompleteForm 변경)
                                     │
                                     ↓
                                Task 11 (통합 테스트)
```

**병렬 가능**: Task 1, 2, 3, 5는 독립적으로 병렬 실행 가능
