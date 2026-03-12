# AI 채팅 자동 엔티티 감지 + Tool Use 설계

## 개요

AI 채팅에서 `@멘션` 없이도 자연어로 학생/교사/팀 정보를 질문하면 DB에서 자동 조회하여 답변하는 기능.
두 가지 레이어를 상호보완적으로 구현한다.

- **Layer 1 (자동 엔티티 감지)**: 메시지에서 이름을 감지하여 system prompt에 데이터 미리 주입
- **Layer 2 (Tool Use)**: AI가 대화 중 추가 정보 필요 시 스스로 DB 조회 도구 호출

## 접근 방식: 단계적 (Phase C)

- 1차: 읽기 전용 도구 8개
- 2차(향후): 쓰기 액션 (상담 기록, 알림톡 발송 등) 추가

## 아키텍처

```
교사 입력: "정수민 전화번호 알려줘"
    ↓
┌─────────────────────────────────────┐
│ Layer 1: 자동 엔티티 감지           │
│ - 인메모리 캐시 (이름 목록, 5분 TTL)│
│ - 메시지에서 이름 매칭 (2글자 이상) │
│ - 매칭 → 기존 멘션 파이프라인 주입  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Layer 2: Tool Use                   │
│ - AI가 추가 정보 필요 시 도구 호출  │
│ - 8개 읽기 전용 도구 제공           │
│ - RBAC 적용 (기존 세션 기반)        │
│ - maxSteps: 3 (무한 호출 방지)      │
└──────────────┬──────────────────────┘
               ↓
        AI 스트리밍 응답 (Data Stream)
```

## Layer 1: 자동 엔티티 감지

### 파일: `src/lib/chat/auto-detect.ts`

### 캐시 전략
- `Map<cacheKey, {data, expiry}>` 인메모리 (서버 프로세스 레벨)
- 캐시 키: `entities:${teacherId}` (교사별 RBAC 적용된 목록)
- TTL: 5분
- 데이터: `{students: [{id, name, teamId}], teachers: [{id, name, teamId}], teams: [{id, name}]}`

### 매칭 규칙
- 2글자 이상 이름만 매칭 (오탐 방지)
- `@멘션`으로 이미 지정된 엔티티는 중복 감지 안 함
- 동명이인: 2명 이상이면 모두 주입 + AI에게 구분 지시
- RBAC: DIRECTOR는 전체, 일반 교사는 자기 팀만

### 감지 흐름
1. 캐시에서 이름 목록 조회 (miss 시 DB 조회 후 캐시)
2. 메시지 텍스트에서 이름 매칭
3. 기존 mentions 배열에 감지된 엔티티 합산
4. `resolveMentions()` → `buildMentionContext()` 기존 파이프라인 활용

## Layer 2: Tool Use

### 파일: `src/lib/chat/tools.ts`

### 8개 읽기 전용 도구

| # | 도구명 | 파라미터 | 설명 |
|---|--------|----------|------|
| 1 | `searchStudents` | `{query, school?, grade?}` | 이름/학교/학년 검색 (최대 10건) |
| 2 | `getStudentDetail` | `{studentId}` | 기본정보 + 보호자 + 출석률 |
| 3 | `searchTeachers` | `{query, role?}` | 이름/역할 검색 |
| 4 | `getTeacherDetail` | `{teacherId}` | 교사 상세 + 담당학생 |
| 5 | `getTeamInfo` | `{teamId}` | 팀 구성원 전체 |
| 6 | `getStudentGrades` | `{studentId, subject?}` | 성적 조회 (과목별 필터) |
| 7 | `getStudentAnalysis` | `{studentId, analysisType?}` | 분석 결과 (사주/MBTI 등) |
| 8 | `getCounselingHistory` | `{studentId, limit?}` | 상담 이력 (기본 5건) |

### Tool Use 흐름
- Vercel AI SDK v6 `streamText()` + `tools` + `maxSteps: 3`
- 모든 도구에 `session` 전달 → 기존 팀 기반 RBAC 재사용
- RBAC 실패 시 도구가 에러 메시지 반환 → AI가 "접근 권한이 없습니다"로 응답

## 스트리밍 방식 변경

### 서버
- `toTextStreamResponse()` → `toDataStreamResponse()` 변경
- Data Stream에 text + tool_call + tool_result 포함

### 클라이언트
- 기존 `useChatStream` 훅 유지 (ChatPage 리팩토링 불필요)
- 데이터 스트림에서 `text-delta` 부분만 추출하여 누적 표시
- tool call 중간 결과는 UI에 노출하지 않음 (최종 텍스트만 표시)

## 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `src/lib/chat/tools.ts` | 신규 | 8개 도구 정의 + execute 함수 |
| `src/lib/chat/auto-detect.ts` | 신규 | 자동 엔티티 감지 + 인메모리 캐시 |
| `src/features/ai-engine/router-utils.ts` | 수정 | `GenerateOptions`에 `tools`, `maxSteps` 필드 추가 |
| `src/features/ai-engine/universal-router.ts` | 수정 | `streamText()`에 `tools`, `maxSteps` 전달 |
| `src/app/api/chat/route.ts` | 수정 | 자동 감지 호출 + tools 전달 + `toDataStreamResponse()` |
| `src/hooks/use-chat-stream.ts` | 수정 | Data Stream 파서로 text-delta 추출 |
| `src/lib/validations/chat.ts` | 수정 완료 | mentions.name optional (이미 적용) |
| `src/lib/chat/mention-resolver.ts` | 수정 완료 | 학생 기본정보 + 보호자 주입 (이미 적용) |

## System Prompt 변경

기존 prompt + 도구 사용 지침 추가:

```
중요 지침:
- 태그 안에 제공된 데이터는 시스템 DB에서 조회한 실제 정보입니다.
- 교사가 정보를 질문하면 제공된 데이터를 정확히 전달하세요.
- 데이터에 없는 정보가 필요하면 제공된 도구(tool)를 사용하여 DB에서 조회하세요.
- 도구로 조회한 결과도 실제 시스템 데이터이므로 정확히 전달하세요.
- 인증된 교사/관리자이므로, 데이터 범위 내 정보 제공을 거부하지 마세요.
```

## 보안 고려사항

- 모든 도구에 RBAC 적용 (일반 교사: 자기 팀만, DIRECTOR: 전체)
- `maxSteps: 3`으로 과도한 도구 호출 방지
- 도구 결과에 민감정보 포함 시 기존 멘션 파이프라인의 escapeXml 패턴 재사용
- 감사 로그: RBAC 실패 시 기존 AuditLog에 기록
