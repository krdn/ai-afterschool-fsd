# 상담 음성 녹음/STT/AI 요약 통합 설계

> 날짜: 2026-02-28
> 상태: 승인됨

## 목표

voice.krdn.kr(voice-recognition) 프로젝트의 녹음, STT(Speech-to-Text), AI 요약 기능을 상담(counseling) 세션 라이브 페이지에 통합하여 교사가 상담 중 녹음하고, 상담 완료 시 자동으로 상담 내용을 채울 수 있도록 한다.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 통합 방식 | voice-recognition 서비스를 외부 API로 호출 |
| 사용 시점 | 상담 진행 중 실시간 녹음 (recording Phase) |
| 활용 범위 | STT → AI 요약 → 상담 완료 폼 '상담 내용' 필드 자동 반영 |
| 인증 | API Key 방식 (Server Action 레벨에서 호출) |
| 접근 방식 | A: voice-recognition API 직접 활용 + WebSocket 진행률 |

## 아키텍처

### 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  ai-afterschool-fsd (상담 라이브 페이지)                      │
│                                                             │
│  [SessionLivePage - recording Phase]                        │
│    ├─ 기존: AI참조패널 + 체크리스트 + 타이머                   │
│    └─ 신규: AudioRecorderPanel (녹음 시작/정지/일시정지)       │
│              │                                              │
│              ↓ 녹음 완료 → webm Blob                         │
│                                                             │
│  [Server Action] uploadCounselingAudioAction()              │
│    ├─ 1. 오디오 파일을 voice-recognition API로 업로드          │
│    ├─ 2. 반환된 noteId를 CounselingSession에 저장            │
│    └─ 3. noteId를 클라이언트에 반환                           │
│                                                             │
│  [프론트엔드 - useVoiceProcessing Hook]                      │
│    ├─ WebSocket → voice-recognition 상태 수신                │
│    ├─ 진행률 표시: STT(50%) → 분석(90%) → 완료(100%)         │
│    └─ 완료 시 transcript + summary 자동 조회                 │
│                                                             │
│  [SessionLivePage - completing Phase]                        │
│    └─ summary를 상담 내용 필드에 자동 반영 (교사 편집 가능)     │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP (API Key)
               ↓
┌─────────────────────────────────────────────────────────────┐
│  voice-recognition (내부망)                                   │
│    ├─ POST /api/service/upload       (파일 업로드 + 큐 등록)  │
│    ├─ GET  /api/service/notes/{id}/transcript  (STT 결과)    │
│    ├─ GET  /api/service/notes/{id}/analysis    (AI 분석)     │
│    └─ WS   /ws/notes/{id}/status               (실시간 진행) │
│                                                             │
│  [Worker] WhisperX STT → Ollama 분석                         │
└─────────────────────────────────────────────────────────────┘
```

### voice-recognition 기술 스택 요약

- Backend: FastAPI (Python) + PostgreSQL + Redis
- Worker: WhisperX (GPU, Whisper medium 모델) + 화자 분리 (pyannote)
- AI 분석: Ollama (llama3.2:3b) - 요약/키워드/액션아이템
- 실시간: Redis PubSub → WebSocket

## DB 변경

### CounselingSession 모델에 3개 필드 추가

```prisma
model CounselingSession {
  // ... 기존 필드 ...

  // 음성 녹음 관련
  audioNoteId      String?   // voice-recognition의 note UUID
  audioStatus      String?   // uploading|processing|completed|failed
  transcriptText   String?   @db.Text  // STT 전체 텍스트 (캐시)
}
```

- `audioNoteId`: voice-recognition 서비스의 note ID 참조 (외래키 아님, 문자열 참조)
- `audioStatus`: 클라이언트 폴백 용도 (WebSocket 끊김 시 polling 대체)
- `transcriptText`: STT 결과 로컬 캐시 (voice-recognition 장애 대비)

## 신규 파일

### ai-afterschool-fsd 측

| 파일 | 역할 |
|------|------|
| `src/features/counseling/services/voice-api.ts` | voice-recognition API 클라이언트 (fetch 기반) |
| `src/hooks/use-audio-recorder.ts` | 브라우저 MediaRecorder Hook (voice-recognition에서 포팅) |
| `src/hooks/use-voice-processing.ts` | WebSocket 상태 추적 + 결과 조회 통합 Hook |
| `src/components/counseling/session-live/audio-recorder-panel.tsx` | 녹음 UI 컴포넌트 |
| `src/lib/actions/counseling/voice.ts` | Server Actions: 업로드, 결과 조회, 상태 업데이트 |

### voice-recognition 측

| 파일 | 역할 |
|------|------|
| `backend/app/api/routes/service.py` | 서비스 간 API Key 인증 엔드포인트 |
| `backend/app/api/deps.py` (수정) | API Key 검증 의존성 추가 |

## 컴포넌트 설계

### SessionLivePage recording Phase 레이아웃 변경

기존 2분할(AI참조 + 체크리스트)을 3분할로 변경:

```
┌─────────────────────────────────────────────┐
│ AI 참조 패널 (기존, 축소 가능)               │ 30%
├─────────────────────────────────────────────┤
│ 녹음 패널 (신규)                            │ 25%
│ 🎙 [녹음 시작] [일시정지] [정지]  00:12:34  │
│ STT 진행: ████████████░░░░ 70%              │
├─────────────────────────────────────────────┤
│ 체크리스트 (기존)                            │ 45%
└─────────────────────────────────────────────┘
```

### AudioRecorderPanel 컴포넌트

voice-recognition의 AudioRecorder 컴포넌트를 포팅하되, shadcn/ui 스타일로 변환:
- useAudioRecorder Hook: MediaRecorder API, webm/opus 포맷
- 녹음 상태: idle → recording → paused → idle (완료)
- 녹음 완료 시 미리듣기 + "이 녹음 사용" 확인
- 확인 후 Server Action으로 업로드

### useVoiceProcessing Hook

```typescript
interface UseVoiceProcessingReturn {
  uploadAudio: (blob: Blob, sessionId: string) => Promise<void>
  status: 'idle' | 'uploading' | 'stt' | 'analyzing' | 'completed' | 'failed'
  progress: number  // 0-100
  transcript: string | null  // 전체 텍스트
  summary: string | null     // AI 요약
  keywords: string[]         // 키워드
  error: string | null
  reset: () => void
}
```

### SessionCompleteForm 변경

- summary 초기값 우선순위: STT 요약 > 체크리스트 조합 > 빈 문자열
- voice-recognition 요약이 있으면 "🎙 AI 음성 요약 적용됨" 배지 표시
- 교사 자유 편집 가능

## voice-recognition API Key 인증

### 환경변수

```env
# voice-recognition .env
SERVICE_API_KEY=<랜덤 생성 키>

# ai-afterschool-fsd .env
VOICE_API_URL=http://192.168.0.5:8200  # 또는 내부 Docker 네트워크 주소
VOICE_API_KEY=<동일한 키>
```

### 서비스 엔드포인트

```
POST /api/service/upload
  Headers: X-Service-Key: <API_KEY>
  Body: multipart/form-data (file, title)
  Response: { id, title, status }

GET /api/service/notes/{id}/transcript
  Headers: X-Service-Key: <API_KEY>
  Response: { segments, full_text, language }

GET /api/service/notes/{id}/analysis
  Headers: X-Service-Key: <API_KEY>
  Response: { summary, topics, keywords, action_items }

WS /ws/notes/{id}/status (인증 없음, 내부망 전제)
  Messages: { note_id, status, progress }
```

## 에러 핸들링

| 실패 시나리오 | 대응 |
|-------------|------|
| voice-recognition 서비스 다운 | 녹음 정상 진행, 업로드 시 에러 토스트 + 로컬 다운로드 제안 |
| 업로드 실패 (네트워크) | 3회 재시도 후 실패 시 webm 파일 로컬 저장 옵션 |
| STT 처리 실패 | `audioStatus=failed` 표시 + "수동 입력" 안내 |
| WebSocket 연결 끊김 | 자동 재연결 (3회) + 10초 간격 polling 폴백 |
| 상담 완료 전 STT 미완료 | "STT 처리 중. 직접 입력 또는 대기" 선택지 |

### 핵심 원칙

1. **녹음 기능은 음성 처리와 독립적**: voice-recognition 다운 시에도 녹음 자체는 항상 가능
2. **교사 입력 우선**: STT 요약은 보조 도구, 교사 직접 작성 내용이 최종 기록
3. **비동기 처리**: STT/분석은 비동기, 상담 완료를 블로킹하지 않음

## 테스트 계획

- [ ] 녹음 시작/정지/일시정지 동작 확인
- [ ] voice-recognition API 업로드 성공/실패 처리
- [ ] WebSocket 진행률 수신 확인
- [ ] STT 완료 후 summary 자동 반영 확인
- [ ] voice-recognition 서비스 다운 시 그레이스풀 처리
- [ ] 상담 완료 폼에서 STT 요약 편집 가능 확인
