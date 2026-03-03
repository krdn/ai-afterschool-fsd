# 상담 전체 흐름 UI/UX 설계

## 목표

예약된 상담의 전체 라이프사이클을 단일 페이지에서 관리:
상담 시작 → 체크리스트 기록 → 완료 → AI 보고서 생성 → 교사 수정 → 확정 → 이력 이동

## 요구사항

| 항목 | 결정 |
|------|------|
| 구현 범위 | 전체 흐름 (상담 시작 ~ 보고서 확정) |
| 보고서 대상 | 교사용 내부 보고서 |
| 확정 후 동작 | DB 저장 + 상담 이력 페이지로 이동 |
| 접근 방식 | 단일 페이지, 상태 기반 전환 (Phase) |
| 기반 설계 | `2026-02-26-session-live-design.md` 확장 |

---

## 섹션 1: 전체 아키텍처

### 워크플로우

```
예약 상세 다이얼로그
  └─ [상담 시작] 버튼 (SCHEDULED 상태일 때)
       ↓ startSessionAction()
       → 예약 상태: SCHEDULED → IN_PROGRESS
       → CounselingSession 생성 (또는 기존 Wizard 세션 활용)
       → AI 체크리스트 자동 생성 (aiSummary 기반)
       → redirect → /counseling/session/[reservationId]
```

### 단일 페이지 3-Phase 전환

```
/counseling/session/[reservationId]

Phase "recording" (상담 진행 중)
  ┌──────────────────────────────────────────────┐
  │ ◀ 돌아가기  학생명·주제  ⏱ 타이머  [상담 완료] │
  ├──────────────┬───────────────────────────────┤
  │ 참고자료 40%  │  체크리스트 60%                │
  │ (AI 탭 전환)  │  □ 항목 + 메모                 │
  │              │  [+ 항목 추가]                  │
  └──────────────┴───────────────────────────────┘
     ↓ [상담 완료] 클릭

Phase "completing" (완료 폼 입력)
  ┌──────────────────────────────────────────────┐
  │ 완료 폼: 상담유형, 소요시간, 요약,              │
  │   만족도, 후속조치 여부/날짜                    │
  │              [AI 보고서 생성하기]                │
  └──────────────────────────────────────────────┘
     ↓ [AI 보고서 생성하기] 클릭

Phase "report" (AI 보고서 수정)
  ┌──────────────────────────────────────────────┐
  │ AI 생성 보고서 (마크다운 에디터)                 │
  │ - 체크리스트 결과 요약                          │
  │ - 상담 내용 분석                               │
  │ - 후속 조치 제안                               │
  │         [재생성]  [보고서 확정]                  │
  └──────────────────────────────────────────────┘
     ↓ [보고서 확정] 클릭
     → 예약 상태: IN_PROGRESS → COMPLETED
     → 보고서 저장 → redirect → /counseling (이력 탭)
```

---

## 섹션 2: 데이터 모델

### 기존 모델 활용

- **CounselingSession**: `summary`(교사 요약) + `aiSummary`(AI 보고서) 저장
- **CounselingNote**: 체크리스트 항목 (이미 존재)
- **ReservationStatus**: IN_PROGRESS (이미 enum에 존재)

### 데이터 흐름

```
Phase "recording":
  체크리스트 CRUD → CounselingNote (addNote/updateNote/deleteNote)
  참고자료 조회 → CounselingSession.aiSummary (Wizard 생성)

Phase "completing":
  완료 폼 데이터 → 로컬 state (아직 DB 저장 안 함)

Phase "report":
  AI 보고서 생성 입력:
    - 체크리스트 결과 (CounselingNote[])
    - 완료 폼 요약 (상담유형, 소요시간, 교사 요약)
    - Wizard AI 참고자료 (aiSummary)
    - 학생 기본 정보 (이름, 학년 등)

  AI 보고서 생성 출력 (마크다운):
    ## 상담 종합 보고서
    ### 상담 개요
    ### 상담 내용 요약
    ### 주요 발견사항
    ### 후속 조치 권고

  보고서 확정 시:
    - CounselingSession.summary = 교사 요약
    - CounselingSession.aiSummary = 최종 보고서 (기존 참고자료 + 보고서)
    - CounselingSession.duration, type 등 업데이트
    - 예약 상태 → COMPLETED
```

---

## 섹션 3: 컴포넌트 구조

### 신규 파일

```
src/
├── app/[locale]/(dashboard)/counseling/session/[reservationId]/
│   └── page.tsx                              # Server Component
│
├── components/counseling/session-live/
│   ├── session-live-page.tsx                 # 메인: Phase 상태 관리
│   ├── session-reference-panel.tsx           # 왼쪽: AI 자료 탭
│   ├── session-checklist.tsx                 # 오른쪽: 체크리스트 목록
│   ├── session-checklist-item.tsx            # 개별 체크 항목 + 메모
│   ├── session-timer.tsx                     # 경과 시간 표시
│   ├── session-complete-form.tsx             # 완료 폼
│   └── session-report-editor.tsx             # AI 보고서 편집 (신규)
│
└── lib/actions/counseling/
    └── report-generation.ts                  # AI 보고서 생성 Action (신규)
```

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `reservation-detail-dialog.tsx` | [상담 시작] 버튼 추가 |
| `session-live.ts` | startSessionAction/completeSessionAction 보완 |
| `features/ai-engine/prompts/counseling-scenario.ts` | 보고서 프롬프트 템플릿 추가 |
| `utils.ts` | IN_PROGRESS 상태 라벨/색상 |

### 컴포넌트 관계도

```
page.tsx (SSR: 데이터 로드)
  └── SessionLivePage (Client, phase state 관리)
        │
        ├── phase === "recording"
        │   ├── 헤더: ◀ | 학생명·주제 | SessionTimer | [상담 완료]
        │   ├── SessionReferencePanel (왼쪽 40%)
        │   │   └── Tabs: [분석 보고서] [시나리오]
        │   └── SessionChecklist (오른쪽 60%)
        │       ├── SessionChecklistItem × N
        │       └── [+ 항목 추가]
        │
        ├── phase === "completing"
        │   └── SessionCompleteForm
        │       └── [AI 보고서 생성하기]
        │
        └── phase === "report"
            └── SessionReportEditor
                ├── MarkdownEditor (기존 컴포넌트 재활용)
                └── [재생성] [보고서 확정]
```

---

## 섹션 4: Server Actions

### 신규 Action

| Action | 파일 | 역할 |
|--------|------|------|
| `generateCounselingReportAction` | `report-generation.ts` | 체크리스트+요약+참고자료 → AI 종합 보고서 생성 |

### 기존 Action 수정

| Action | 변경 내용 |
|--------|----------|
| `startSessionAction` | AI 체크리스트 생성 로직 통합 |
| `completeSessionAction` | 보고서 저장, 예약 COMPLETED 처리, 데이터 업데이트 |

### AI 보고서 생성 상세

```typescript
// 입력
{
  sessionId: string
  notes: { content: string; checked: boolean; memo?: string }[]
  completionData: {
    type: CounselingType
    duration: number
    summary: string
    satisfactionScore?: number
    followUpRequired: boolean
    followUpDate?: Date
  }
  aiReference: string  // 기존 aiSummary (Wizard 생성)
  studentName: string
}

// 출력: 마크다운 보고서 string
```

### FeatureType 추가

`counseling_report` → FeatureMapping에 등록하여 LLM 모델/설정 관리

---

## 섹션 5: 에러 처리

| 상황 | 처리 |
|------|------|
| AI 보고서 생성 실패 | 에러 UI + [재시도] 버튼, 수동 작성 가능 |
| 체크리스트 저장 실패 | toast 경고 + 재시도 (데이터 로컬 유지) |
| 브라우저 이탈 | beforeunload 경고, 체크리스트는 실시간 저장됨 |
| 세션 만료 | 재로그인 후 해당 페이지로 복귀 가능 (데이터 DB 유지) |

---

## 섹션 6: 기존 설계와의 관계

이 설계는 `2026-02-26-session-live-design.md`를 **확장**합니다:

- Phase "recording" + "completing" = 기존 설계의 전체 범위
- Phase "report" = **신규 추가** (AI 보고서 생성/수정/확정)
- `SessionReportEditor` + `report-generation.ts` = 완전 신규
- 기존 설계의 컴포넌트 구조, 자동 저장, 데이터 모델은 그대로 활용
