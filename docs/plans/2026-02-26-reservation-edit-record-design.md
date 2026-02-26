# 상담 예약 수정 & 상담 기록 통합 디자인

## 개요

기존 `ReservationDetailDialog`를 읽기/편집/기록 3모드로 확장하여, 예약 수정과 상담 완료 기록을 하나의 다이얼로그에서 처리한다.

## 배경

### 현재 문제점
1. 예약 수정 UI가 없음 — 백엔드 `updateReservationAction`은 존재하지만 프론트엔드 진입점이 없음
2. 예약 완료 시 `CounselingSession`이 `duration=30, type=ACADEMIC`으로 하드코딩 생성
3. 상담 내용 기록을 위해 별도 페이지(`/counseling/new?id=xxx`)로 이동해야 하는 끊긴 UX

### 목표
- 예약 카드에서 직접 수정/완료 기능 제공
- 상담 완료 시 내용을 즉시 기록 (상담 유형, 시간, 요약, 만족도, 후속 조치)
- 학생/주제 변경 시 AI 보고서 자동 무효화

## 핵심 결정사항

| # | 결정 | 선택지 | 이유 |
|---|------|--------|------|
| 1 | 수정 진입점 | 카드에 "수정" 버튼 | 최소 클릭으로 수정 접근 |
| 2 | 수정 UI 형태 | 상세 다이얼로그 확장 (3모드) | 기존 컴포넌트 활용, 자연스러운 동선 |
| 3 | 수정 필드 범위 | 전체 (날짜/시간/학생/학부모/주제) | 백엔드가 이미 지원 |
| 4 | AI 보고서 처리 | 학생/주제 변경 시 자동 무효화 | 데이터 정합성 보장 |
| 5 | 상담 기록 통합 | 완료 버튼 → 기록 모드 전환 | 끊긴 UX 해결 |

## 컴포넌트 구조

```
ReservationDetailDialog (상위 — 모드 관리)
  ├── DetailReadView        (읽기 모드 — 기존 코드 추출)
  ├── ReservationEditForm   (편집 모드 — 새로 생성)
  └── SessionRecordForm     (기록 모드 — 새로 생성)
```

## 모드 전환 흐름

```
카드 클릭 → 상세 다이얼로그 (읽기 모드)
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
"수정" 클릭   "완료" 클릭   "취소/노쇼" 클릭
    │           │           │
    ▼           ▼           ▼
편집 모드     기록 모드     기존 AlertDialog
(예약 정보    (상담 내용
 수정)        기록+완료)
    │           │
    ▼           ▼
저장 성공     저장 성공
    │           │
    ▼           ▼
읽기 모드 복귀 + router.refresh()
```

## 편집 모드 상세

### ReservationEditForm Props

```typescript
interface ReservationEditFormProps {
  reservation: ReservationDetail
  onSave: () => void
  onCancel: () => void
}
```

### 수정 가능 필드

| 필드 | UI | 재사용 컴포넌트 |
|------|-----|----------------|
| 날짜 | 캘린더 | ReservationCalendar |
| 시간 | 타임슬롯 | TimeSlotGrid |
| 학생 | Select | 기존 패턴 |
| 학부모 | Select (학생 연동) | 기존 패턴 |
| 주제 | Input | 기본 |

### AI 무효화 조건

- `studentId` 또는 `topic`이 원본과 다르고
- `detail.counselingSession?.aiSummary`가 존재할 때
- 저장 전 경고: "학생 또는 주제가 변경되어 기존 AI 보고서가 삭제됩니다. 계속하시겠습니까?"

## 기록 모드 상세

### SessionRecordForm Props

```typescript
interface SessionRecordFormProps {
  reservation: ReservationDetail
  onSave: () => void
  onCancel: () => void
}
```

### 입력 필드

| 필드 | 타입 | 필수 | 기본값 |
|------|------|------|--------|
| type | Select (CounselingType) | ✓ | ACADEMIC |
| duration | Number (5-180) | ✓ | 30 |
| summary | Textarea (10-1000자) | ✓ | - |
| aiSummary | AI 생성 | ✗ | 기존 AI 보고서 |
| followUpRequired | Checkbox | ✗ | false |
| followUpDate | Date | 조건부 | - |
| satisfactionScore | Select (1-5) | ✗ | - |

## 신규 Server Actions

### completeWithRecordAction

```typescript
interface CompleteWithRecordInput {
  reservationId: string
  type: CounselingType
  duration: number
  summary: string
  aiSummary?: string
  followUpRequired: boolean
  followUpDate?: string
  satisfactionScore?: number
}
```

동작:
1. 인증 + RBAC 확인
2. 예약 상태 SCHEDULED 확인
3. CounselingSession 생성 (교사 입력값 반영)
4. 예약 상태 → COMPLETED + counselingSessionId 연결
5. revalidatePath

### invalidateAiSummaryAction

```typescript
export async function invalidateAiSummaryAction(
  reservationId: string
): Promise<ActionResult<void>>
```

동작:
1. 인증 확인
2. 예약 → counselingSessionId 조회
3. counselingSession.aiSummary = null 업데이트
4. revalidatePath

## 카드 버튼 변경

```
변경 전: [완료] [취소] [노쇼]
변경 후: [수정] [완료] [취소] [노쇼]
```

- "수정" → 상세 다이얼로그 편집 모드
- "완료" → 상세 다이얼로그 기록 모드 (기존 AlertDialog 제거)
- "취소/노쇼" → 기존 AlertDialog 유지

## 에러 처리

| 시나리오 | 처리 |
|---------|------|
| 시간 충돌 (편집) | toast.error + 시간 재선택 유도 |
| SCHEDULED 아닌 예약 | 수정/완료 버튼 숨김 |
| 네트워크 에러 | toast.error + 폼 상태 유지 |
| 학생 권한 없음 | toast.error |

## 변경 파일 목록

| 파일 | 유형 | 내용 |
|------|------|------|
| `reservation-detail-dialog.tsx` | 수정 | 3모드 관리 |
| `reservation-card.tsx` | 수정 | 수정 버튼 추가, 완료 동작 변경 |
| `reservation-list.tsx` | 수정 | 모드 진입 지원 |
| `reservation-edit-form.tsx` | 신규 | 편집 모드 폼 |
| `session-record-form.tsx` | 신규 | 기록 모드 폼 |
| `reservation-complete.ts` | 신규 | completeWithRecordAction |
| `reservation-ai.ts` | 신규 | invalidateAiSummaryAction |
| `reservations.ts` (validations) | 수정 | completeWithRecord 스키마 |

## 구현 순서

1. Phase 1: 백엔드 (Server Actions + 검증 스키마)
2. Phase 2: 편집 모드 UI
3. Phase 3: 기록 모드 UI
4. Phase 4: 통합 & 테스트
