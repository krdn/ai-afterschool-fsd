# 상담 진행 중 실시간 기록 기능 디자인

## 목표

예약된 상담을 시작하고, 진행하면서 체크리스트 기반 메모를 남기고, 완료 시 자동 정리하는 워크플로우 구현.

## 요구사항

| 항목 | 결정 |
|------|------|
| 기록 방식 | 체크리스트 + 메모 |
| 상담 주제 | AI가 시나리오/보고서 기반으로 초안 생성 + 교사 편집 |
| 레이아웃 | 분할 화면 (왼쪽 AI 자료, 오른쪽 기록) — PC 중심 |
| 진입 경로 | 예약 상세 다이얼로그 → [상담 시작] → 전용 페이지 |
| 완료 처리 | 전용 페이지에서 바로 완료 (메모 → summary 자동 정리 + 만족도/후속조치) |

---

## 섹션 1: 데이터 모델

### 새 모델: CounselingNote

```prisma
model CounselingNote {
  id                   String             @id @default(cuid())
  counselingSessionId  String
  counselingSession    CounselingSession  @relation(fields: [counselingSessionId], references: [id], onDelete: Cascade)
  content              String             // 체크리스트 항목 내용
  memo                 String?            // 해당 항목에 대한 메모
  checked              Boolean            @default(false)
  order                Int                // 정렬 순서
  source               String             @default("MANUAL") // "AI" | "MANUAL"
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  @@index([counselingSessionId, order])
}
```

### 기존 모델 변경

- `CounselingSession`: `notes CounselingNote[]` 관계 추가
- `ReservationStatus` enum: `IN_PROGRESS` 추가

### 예약 상태 흐름

```
SCHEDULED → IN_PROGRESS → COMPLETED
              (새 상태)
```

---

## 섹션 2: 사용자 흐름

### 전체 흐름

```
예약 카드 클릭
  → 상세 다이얼로그 (read 모드)
    → [상담 시작] 버튼 (SCHEDULED 상태일 때만 표시)
      → 예약 상태: SCHEDULED → IN_PROGRESS
      → CounselingSession 생성 (Wizard 예약이면 기존 세션 활용)
      → AI가 시나리오/보고서 기반 체크리스트 초안 생성 → CounselingNote 저장
      → /counseling/session/[reservationId] 전용 페이지로 이동
```

### 전용 페이지 레이아웃 (분할 화면)

```
┌─────────────────────────────────────────────────────────┐
│  ◀ 돌아가기    학생명 · 상담 주제    ⏱ 00:15:30   [완료] │
├────────────────────────┬────────────────────────────────┤
│   📋 AI 자료 (왼쪽)     │   ✅ 상담 기록 (오른쪽)          │
│                        │                                │
│  [분석 보고서] [시나리오] │  □ 수학 성적 하락 원인 파악       │
│                        │    메모: ___________            │
│  (Markdown 렌더링)      │  ✓ 친구 관계 확인                │
│                        │    메모: "영희랑 다툼 있었음"      │
│                        │  □ 가정환경 변화 여부              │
│                        │                                │
│                        │  [+ 항목 추가]                   │
│                        │                                │
├────────────────────────┴────────────────────────────────┤
│  [상담 완료] → 만족도(⭐) + 후속조치 + summary 자동 정리    │
└─────────────────────────────────────────────────────────┘
```

### 상담 완료 시

1. [상담 완료] 버튼 클릭
2. 하단에 완료 폼 노출: 만족도(별점), 후속조치(체크+날짜), 상담시간(자동 계산 or 수동)
3. 체크된 항목 + 메모를 summary로 자동 조합
4. 교사가 summary를 최종 편집 가능
5. 저장: 예약 IN_PROGRESS → COMPLETED, CounselingSession 업데이트
6. 상담 관리 목록으로 돌아감

### 자동 저장

체크/메모 변경 시 debounce 500ms로 자동 저장 → 브라우저 닫아도 데이터 유지

---

## 섹션 3: Server Actions & API

### 새로 만들 Server Actions

| Action | 역할 | 호출 시점 |
|--------|------|----------|
| `startSessionAction(reservationId)` | 예약 → IN_PROGRESS, Session 생성/연결, AI 체크리스트 생성 | [상담 시작] |
| `generateChecklistAction(sessionId)` | AI 기반 체크리스트 초안 생성 → CounselingNote 저장 | startSession 내부 |
| `updateNoteAction(noteId, {checked, memo})` | 개별 노트 체크/메모 업데이트 | 자동 저장 (debounce) |
| `addNoteAction(sessionId, content)` | 교사가 항목 수동 추가 | [+ 항목 추가] |
| `deleteNoteAction(noteId)` | 항목 삭제 | 삭제 버튼 |
| `reorderNotesAction(sessionId, noteIds[])` | 항목 순서 변경 | 드래그앤드롭 (선택) |
| `completeSessionAction(sessionId, {...})` | 상담 완료 처리 | [상담 완료] |

### AI 체크리스트 생성 로직

1. 예약에 연결된 CounselingSession 확인
2. aiSummary(시나리오/보고서) 파싱
3. AI 프롬프트로 5-8개 체크리스트 항목 생성
4. CounselingNote 레코드로 저장 (source: "AI")

### 자동 저장 전략

- 프론트엔드에서 체크/메모 변경 시 debounce 500ms
- updateNoteAction 호출 → DB 업데이트
- 실패 시 toast 경고 + 재시도

---

## 섹션 4: 컴포넌트 구조

### 새로 만들 파일

```
src/
├── app/[locale]/counseling/session/[reservationId]/
│   └── page.tsx                          # 전용 페이지 (SSR)
│
├── components/counseling/session-live/
│   ├── session-live-page.tsx             # 메인 분할 레이아웃
│   ├── session-reference-panel.tsx       # 왼쪽: AI 자료 탭
│   ├── session-checklist.tsx             # 오른쪽: 체크리스트 목록
│   ├── session-checklist-item.tsx        # 개별 체크 항목 + 메모
│   ├── session-timer.tsx                 # 상단 경과 시간 표시
│   └── session-complete-form.tsx         # 하단 완료 폼
│
├── lib/actions/counseling/
│   ├── session-live.ts                   # startSession, completeSession
│   ├── session-notes.ts                  # CRUD: add, update, delete, reorder
│   └── session-checklist-ai.ts           # AI 체크리스트 생성
│
└── lib/validations/
    └── session-notes.ts                  # Zod 스키마
```

### 수정할 기존 파일

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | CounselingNote 모델, IN_PROGRESS 상태 추가 |
| `reservation-detail-dialog.tsx` | [상담 시작] 버튼 추가 |
| `reservation-card.tsx` | IN_PROGRESS 상태 표시 |
| `utils.ts` | IN_PROGRESS 상태 라벨/색상 추가 |

### 컴포넌트 관계도

```
page.tsx (SSR: 데이터 로드)
  └── SessionLivePage (Client)
        ├── 헤더: ◀ 돌아가기 | 학생명·주제 | SessionTimer | [완료]
        ├── 분할 영역:
        │   ├── SessionReferencePanel (왼쪽 40%)
        │   │   └── Tabs: [분석 보고서] [시나리오] [학부모용]
        │   └── SessionChecklist (오른쪽 60%)
        │       ├── SessionChecklistItem × N
        │       └── [+ 항목 추가]
        └── SessionCompleteForm (조건부 표시)
```
