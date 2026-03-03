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
