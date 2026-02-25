# AI 상담 시나리오 생성 기능 설계

## 개요

예약 생성 시 학생 선택 후 분석자료/성향/이전 상담내용을 표시하고, 상담 주제를 기반으로 AI가 3단계 문서 패키지(분석 보고서 + 상담 시나리오 + 학부모 공유용)를 생성한다. 교사가 단계별로 편집/승인하면 `CounselingSession.aiSummary`에 저장한다.

## UX 흐름: 4단계 위자드

예약 관리 탭 "새 예약 등록" 클릭 시 기존 `ReservationForm`이 위자드로 확장된다.

### Step 1: 예약 정보

- 컴팩트 인라인 달력 + 시간슬롯 2컬럼 배치
- 학생/학부모 Select
- 상담 주제 입력 (필수)
- "다음" 클릭 시 학생 선택 검증

### Step 2: 학생 인사이트 + 분석 보고서

학생 선택 즉시 병렬 데이터 로드:
- 성향 요약 (PersonalitySummary.coreTraits)
- 분석 데이터 (MBTI, 사주, 성명학, 관상, 손금 — UnifiedPersonalityData)
- 이전 상담 이력 (최근 5건)
- 성적 추이 (GradeHistory)

"AI 보완" 클릭 시 분석 보고서 생성:
- 학생 성향 종합 / 학업 현황 / 상담 이력 패턴 / 이번 상담 연관성
- 편집 가능 (textarea + 마크다운 미리보기)
- "승인" 또는 "재생성"

### Step 3: 상담 시나리오

Step 2 승인 후 자동 생성:
- 도입 (5분): 라포 형성, 첫 질문
- 본론 (20분): 탐색 질문 + 예상 반응 + 대응 전략
- 마무리 (5분): 합의사항, 후속 조치
- 편집 가능 → "승인" 또는 "재생성"

### Step 4: 학부모 공유용

Step 3 승인 후 자동 생성:
- 상담 목적 안내, 준비 요청사항, 일정 안내
- 민감 정보(심리 분석, 성격 진단 등) 절대 미포함
- 편집 가능 → "승인" 또는 "재생성"
- "예약 등록" 최종 제출

## 데이터 흐름

### Step 1 → Step 2 전환

```
Promise.all([
  getUnifiedPersonalityData(studentId),
  getStudentCounselingHistory(studentId, { take: 5 }),
  getStudentGradeHistory(studentId),
  getPersonalitySummary(studentId),
])
```

### AI 생성 체인

```
Step 2 "AI 보완" → generateAnalysisReportAction({ studentId, topic, personalityData, counselingHistory, gradeHistory })
Step 2 승인     → generateScenarioAction({ studentId, topic, approvedReport, personalityData })
Step 3 승인     → generateParentSummaryAction({ topic, approvedScenario, studentName, scheduledAt })
```

### 최종 제출

```
createReservationWithScenarioAction({
  scheduledAt, studentId, parentId, topic,
  analysisReport, scenario, parentSummary,
})
→ 트랜잭션:
  1. ParentCounselingReservation 생성 (SCHEDULED)
  2. CounselingSession 사전 생성 (aiSummary에 3문서 합본)
  3. 예약.counselingSessionId 연결
```

### aiSummary 저장 형식

```markdown
## 학생 분석 보고서
[Step 2 승인본]

---

## 상담 시나리오
[Step 3 승인본]

---

## 학부모 공유용
[Step 4 승인본]
```

## 컴포넌트 구조

```
ReservationWizard (상태 머신 관리)
├─ WizardStepper (스텝 진행 표시줄)
├─ Step 1: ReservationInfoStep
│   ├─ CompactCalendar (인라인 달력 + 시간슬롯 2컬럼)
│   ├─ StudentSelect (기존 로직 추출)
│   └─ TopicInput
├─ Step 2: StudentInsightStep
│   ├─ PersonalitySummaryCard (기존 재활용)
│   ├─ AnalysisOverview (MBTI/사주 등 요약 카드)
│   ├─ CounselingHistoryList (최근 5건 타임라인)
│   ├─ GradeTrendChart (성적 추이)
│   └─ AnalysisReportEditor (AI 보고서 편집/승인)
├─ Step 3: ScenarioStep
│   └─ ScenarioEditor (시나리오 편집/승인)
└─ Step 4: ParentSummaryStep
    └─ ParentSummaryEditor (학부모 공유용 편집/승인/복사)
```

### 기존 코드 재활용

| 기존 | 변경 |
|---|---|
| `ReservationForm` | `formView === "form"` 시 `ReservationWizard`로 교체 |
| `PersonalitySummaryCard` | Step 2에서 재활용 |
| `AISupportPanel` 데이터 패칭 로직 | Server Action으로 재활용 |
| `counseling-page-tabs.tsx` | 위자드 렌더링 전환 |

## AI 프롬프트 설계

### 새 featureType 3종

| featureType | 용도 | temperature | maxTokens |
|---|---|---|---|
| `counseling_analysis` | 학생 분석 보고서 | 0.3 | 1000 |
| `counseling_scenario` | 상담 시나리오 | 0.5 | 1500 |
| `counseling_parent` | 학부모 공유용 | 0.3 | 500 |

### 프롬프트 1: 분석 보고서 (buildAnalysisReportPrompt)

역할: 학생 상담 전문 교육 컨설턴트

입력: 학생 기본 정보, 성향 5종(MBTI/사주/성명학/관상/손금), 이전 상담 5건, 성적 추이, 상담 주제

출력: 학생 성향 종합 / 학업 현황 / 상담 이력 패턴 / 이번 상담 연관성

### 프롬프트 2: 상담 시나리오 (buildScenarioPrompt)

역할: 학생 상담 시나리오 설계 전문가

입력: 승인된 분석 보고서, 상담 주제, 학생 성향

출력: 도입(라포 형성, 첫 질문) / 본론(탐색 질문 + 예상 반응 + 대응) / 마무리(합의, 후속 조치)

### 프롬프트 3: 학부모 공유용 (buildParentSummaryPrompt)

역할: 학부모 커뮤니케이션 전문가

입력: 승인된 시나리오, 학생명, 상담 일시, 주제

출력: 상담 목적 / 준비 요청사항 / 일정 안내 (민감 정보 제외)

## 에러 처리

### AI 생성 실패

- 타임아웃/오류: 토스트 알림 + "재생성" 버튼
- refusal 응답: 기존 isRefusalResponse() → 다음 모델 폴백

### 위자드 네비게이션

- "이전" 클릭: 이전 스텝 복귀, 입력값 유지 (재승인 필요)
- 미승인 상태에서 "다음": 버튼 비활성
- "AI 보완 없이 진행": Step 2에서 스킵 → Step 3, 4 건너뛰고 기존 예약만 생성

### 데이터 부족

- 성향 분석 없음: "분석 데이터 없음" 안내 + 가용 데이터만으로 생성
- 이전 상담 없음: "첫 상담입니다" 표시
- 성적 데이터 없음: 해당 섹션 생략

### 동시성

- 시간 충돌: 최종 제출 시 기존 createReservationWithConflictCheck() 트랜잭션에서 감지 → Step 1 복귀
- 브라우저 이탈: 위자드 상태 소실 (드래프트 저장 없음)
