# AI Agent Workflow System Design

> AI 기반 방과후학교 관리 시스템의 이벤트 기반 Agent 자동화 + 워크플로우 그래프 시각화

## 1. 목표

- 반복적인 수동 트리거(버튼 클릭)를 **이벤트 기반 자동 파이프라인**으로 전환
- 워크플로우를 **노드-엣지 그래프**로 시각화하여 관리자가 직관적으로 파악
- 노드 선택 시 **설정 패널**에서 파라미터 변경 가능
- 3개 Agent MVP: 학생 프로파일링, 성적 분석, 상담 어시스턴트

## 2. 전제 조건

- **단일 Node.js 프로세스 환경**: `output: standalone` Docker 배포에서 Node.js 프로세스가 하나로 유지됨을 전제. 멀티 프로세스/서버리스 환경 이전 시 BullMQ 마이그레이션 필요.
- **EventBus 리팩토링 선행**: 현재 `onEvent(listener)` (단일 채널 브로드캐스트) API를 `on(eventName, listener)` (이벤트별 구독) 패턴으로 리팩토링해야 함.
- **이벤트 네이밍 통일**: 기존 `analysis:complete` (콜론 구분자)을 `analysis.completed` (점 구분자)로 마이그레이션. 모든 이벤트는 `domain.action` 형식 사용.

## 3. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                      Event Bus (확장)                        │
│  student.created | grade.uploaded | grade.confirmed          │
│  counseling.scheduled | counseling.completed                 │
│  analysis.completed | profile.updated                        │
└────────┬────────────┬─────────────┬─────────────┬───────────┘
         │            │             │             │
   ┌─────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐  │
   │ Profiling   │ │ Grade     │ │ Counseling  │  │
   │ Agent       │ │ Agent     │ │ Agent       │  │
   └─────┬──────┘ └──┬────────┘ └─┬──────────┘  │
         │            │            │              │
         └────────────┴─────┬──────┘              │
                            │                     │
                     ┌──────▼──────┐              │
                     │ Agent       │◄─────────────┘
                     │ Runtime     │
                     │ (실행 엔진)   │
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │ DB          │
                     │ (상태/이력)   │
                     └─────────────┘
```

### 접근법: DB 기반 Agent + React Flow 시각화

**선택 이유:**
- 현재 인프라(PostgreSQL + Prisma + EventEmitter)만으로 구현 가능
- Redis 큐(BullMQ) 없이도 MVP 동작 (나중에 마이그레이션 가능)
- React Flow v12가 노드 그래프 UI에 최적화
- 미리 정의된 워크플로우를 시각화하고 노드별 설정만 편집 (자유 배치 에디터는 아님)

**탈락 대안:**
- BullMQ 풀스택: 과도한 초기 복잡도
- 순수 cron: 이벤트 기반이 아님, 그래프 시각화 의미 없음

## 4. DB 스키마

### 4.1 AgentConfig

```prisma
model AgentConfig {
  id          String    @id @default(cuid())
  type        AgentType @unique
  name        String
  description String?
  enabled     Boolean   @default(false)
  workflow    Json      // React Flow 호환 { nodes: [], edges: [] }
  settings    Json      @default("{}")  // Agent 전역 설정
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  executions  AgentExecution[]
}

enum AgentType {
  STUDENT_PROFILING
  GRADE_ANALYSIS
  COUNSELING_ASSISTANT
  MATCHING_OPTIMIZER
  REPORT_ORCHESTRATOR
}
```

### 4.2 AgentExecution

```prisma
model AgentExecution {
  id           String          @id @default(cuid())
  agentType    AgentType       // AgentType으로 직접 조회 (id 대신)
  agentId      String
  agent        AgentConfig     @relation(fields: [agentId], references: [id])
  status       ExecutionStatus @default(PENDING)
  triggerEvent String          // "student.created"
  triggerData  Json?           // 이벤트 페이로드
  currentNodeId String?        // 현재 실행 중인 노드 ID (일시정지 시 사용)
  startedAt    DateTime?
  completedAt  DateTime?
  result       Json?
  error        String?

  nodeLogs     AgentNodeLog[]

  createdAt    DateTime @default(now())

  @@index([agentType, status])
  @@index([agentId, status])
  @@index([createdAt])
}

enum ExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 4.3 AgentNodeLog

```prisma
model AgentNodeLog {
  id          String         @id @default(cuid())
  executionId String
  execution   AgentExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  nodeId      String         // workflow JSON 내 노드 ID
  nodeName    String
  status      NodeStatus     @default(PENDING)
  input       Json?
  output      Json?
  error       String?
  startedAt   DateTime?
  completedAt DateTime?
  durationMs  Int?

  @@index([executionId])
  @@unique([executionId, nodeId])  // 동일 실행 내 노드별 1건 (멱등성)
}

enum NodeStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
  WAITING
}
```

## 5. 이벤트 버스 확장

### 5.1 EventBus 리팩토링

현재 API (`onEvent(listener)` → 단일 채널)를 이벤트별 구독으로 변경:

```typescript
// src/lib/events/event-bus.ts (리팩토링)

class EventBus extends EventEmitter {
  emit<K extends keyof AgentEventMap>(event: K, data: AgentEventMap[K]): boolean {
    return super.emit(event, data);
  }

  on<K extends keyof AgentEventMap>(event: K, listener: (data: AgentEventMap[K]) => void): this {
    return super.on(event, listener);
  }

  // 기존 SSE 용 onEvent()는 하위 호환 유지
  onEvent(listener: (event: ServerEvent) => void): () => void { ... }
}
```

### 5.2 이벤트 타입 정의

```typescript
// src/lib/events/types.ts (확장)

type AgentEventMap = {
  'student.created':      { studentId: string; teacherId: string };
  'student.updated':      { studentId: string; fields: string[] };
  'grade.uploaded':       { studentId: string; scanId: string; imageUrl: string };
  'grade.confirmed':      { studentId: string; gradeHistoryId: string };
  'counseling.scheduled': { reservationId: string; studentId: string; scheduledAt: string };
  'counseling.started':   { reservationId: string };
  'counseling.completed': { sessionId: string; reservationId: string };
  'analysis.completed':   { studentId: string; analysisType: AnalysisType; targetType: string };
  'profile.updated':      { studentId: string; completedAnalyses: AnalysisType[] };
  'report.generated':     { studentId: string; reportId: string; reportType: string };
  'mbti.submitted':       { studentId: string; resultId: string };
  'vark.submitted':       { studentId: string; resultId: string };
};
```

### 5.3 이벤트 발행 위치

| 이벤트 | 발행 위치 (Server Action / API) |
|--------|-------------------------------|
| `student.created` | `lib/actions/student/create.ts` |
| `grade.uploaded` | `lib/actions/student/grade-ocr.ts` (uploadAndProcessGradeImage) |
| `grade.confirmed` | `lib/actions/student/grade-ocr.ts` (confirmOcrResult) |
| `counseling.scheduled` | `lib/actions/counseling/reservations.ts` |
| `counseling.completed` | `features/counseling/repositories/reservations.ts` (completeReservation) |
| `analysis.completed` | 기존 이벤트를 `analysis.completed`로 마이그레이션 |
| `mbti.submitted` | `lib/actions/student/mbti-survey.ts` |
| `vark.submitted` | `lib/actions/student/vark-survey.ts` |

## 6. Agent 프레임워크

### 6.1 베이스 클래스

```typescript
// src/features/agents/core/base-agent.ts

type ExecutionContext = {
  executionId: string;
  triggerEvent: string;
  triggerData: Record<string, unknown>;
  nodeResults: Map<string, unknown>;  // nodeId → output
};

abstract class BaseAgent {
  abstract type: AgentType;
  abstract subscribedEvents: string[];

  async execute(event: AgentEvent, workflow: WorkflowDefinition): Promise<ExecutionResult> {
    // 중복 실행 방지: 동일 이벤트+데이터로 RUNNING 실행이 있으면 스킵
    const existing = await this.findRunningExecution(event);
    if (existing) return { skipped: true, reason: 'duplicate' };

    const execution = await this.createExecution(event);
    const context: ExecutionContext = {
      executionId: execution.id,
      triggerEvent: event.type,
      triggerData: event.data,
      nodeResults: new Map(),
    };

    try {
      const sortedNodes = this.topologicalSort(workflow);

      for (const node of sortedNodes) {
        const nodeLog = await this.createNodeLog(execution.id, node);

        if (node.type === 'condition') {
          const result = await this.evaluateCondition(node, context);
          context.nodeResults.set(node.id, result);
          // 조건 결과에 따라 분기 — false 경로의 노드는 SKIPPED
          await this.markSkippedBranch(workflow, node, result, execution.id);
        } else {
          const handler = this.nodeHandlers[node.data.action];
          if (!handler) throw new Error(`Unknown handler: ${node.data.action}`);
          const result = await this.executeWithRetry(handler, node, context);
          context.nodeResults.set(node.id, result);
        }

        await this.updateNodeLog(nodeLog.id, 'COMPLETED', context.nodeResults.get(node.id));
      }

      return this.completeExecution(execution, context);
    } catch (error) {
      await this.failExecution(execution, error);
      throw error;
    }
  }

  // 재시도 래퍼: 멱등성은 각 handler가 executionId+nodeId 기반으로 보장
  private async executeWithRetry(
    handler: NodeHandler, node: WorkflowNode, context: ExecutionContext, maxRetries = 3
  ): Promise<unknown> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await handler(node.data.config, context);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await sleep(1000 * Math.pow(2, attempt)); // exponential backoff
      }
    }
  }

  abstract nodeHandlers: Record<string, NodeHandler>;
}
```

### 6.2 Agent 레지스트리 & 초기화

```typescript
// src/features/agents/core/registry.ts

class AgentRegistry {
  private agents = new Map<AgentType, BaseAgent>();
  private cleanupFns: (() => void)[] = [];

  register(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
  }

  // EventBus 구독 설정
  async initialize(): Promise<void> {
    // 1. RUNNING 상태로 남은 실행을 FAILED로 처리 (서버 재시작 복구)
    await db.agentExecution.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'FAILED', error: 'Server restarted during execution', completedAt: new Date() },
    });

    // 2. 활성화된 Agent의 이벤트 구독
    const configs = await db.agentConfig.findMany({ where: { enabled: true } });
    for (const config of configs) {
      const agent = this.agents.get(config.type);
      if (!agent) continue;

      for (const eventName of agent.subscribedEvents) {
        const handler = async (data: unknown) => {
          try {
            await agent.execute({ type: eventName, data }, config.workflow);
          } catch (error) {
            logger.error({ err: error, agentType: config.type, event: eventName }, 'Agent execution failed');
          }
        };
        eventBus.on(eventName, handler);
        this.cleanupFns.push(() => eventBus.off(eventName, handler));
      }
    }
  }

  // Agent 활성화/비활성화 시 구독 갱신
  async reload(): Promise<void> {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    await this.initialize();
  }
}
```

**초기화 위치**: `src/instrumentation.ts` (Next.js instrumentation hook)

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { agentRegistry } = await import('@/features/agents/core/registry');
    await agentRegistry.initialize();
  }
}
```

### 6.3 워크플로우 노드 타입

| 타입 | 아이콘 | 색상 | 역할 |
|------|--------|------|------|
| `trigger` | Zap (번개) | blue | 이벤트 수신 시작점 |
| `process` | Cog (기어) | slate | 비즈니스 로직 실행 |
| `condition` | GitBranch (분기) | amber | 조건 분기 (true/false 출력) |
| `action` | Play (실행) | emerald | 외부 작업 실행 (알림, 저장) |

> **MVP에서 `wait` 노드 제외**: wait 노드의 재개 메커니즘(DB 폴링 + 이벤트 재연결)은 복잡도가 높아 향후 고려로 이동. 상담 Agent는 `counseling.scheduled`와 `counseling.completed` 두 개의 독립 워크플로우로 분리하여 해결.

### 6.4 FSD 의존성 해결

`features/agents`는 다른 feature의 서비스를 직접 import하지 않음. 대신 `lib/actions/`의 Server Action을 통해 간접 호출:

```typescript
// Agent nodeHandler 내부
const result = await calculateSajuAction(studentId);  // lib/actions 경유
// ❌ import { calculateSaju } from '@/features/analysis/saju/saju';  // 직접 참조 금지
```

이를 통해 FSD 계층 규칙(`agents` → `lib` → `features`)을 준수.

## 7. 3개 Agent 워크플로우 정의

### 7.1 Student Profiling Agent

**구독 이벤트**: `student.created`, `mbti.submitted`, `vark.submitted`, `analysis.completed`

**워크플로우 A: 학생 등록 시** (trigger: `student.created`)
```
[trigger: student.created]
    ↓
[process: 사주 계산] → [process: 이름 분석]
    ↓                      ↓
[action: 사주 LLM 해석]  [action: 이름 LLM 해석]
    ↓                      ↓
[action: 교사 알림 — "기본 분석 완료, MBTI/VARK 설문을 진행하세요"]
```

**워크플로우 B: 설문 완료 시** (trigger: `mbti.submitted` / `vark.submitted`)
```
[trigger: mbti.submitted]
    ↓
[process: MBTI 채점]
    ↓
[action: MBTI LLM 해석]
    ↓
[condition: 모든 분석 완료? (사주+이름+MBTI+VARK)]
    ├─ yes → [action: 통합 프로파일 생성] → [action: 교사 알림]
    └─ no → [action: 부분 완료 알림]
```

**설정 가능 항목:**
- LLM 해석 자동 실행 여부 (on/off)
- 통합 프로파일 자동 생성 최소 분석 개수 (기본: 3)
- 알림 대상 (담당 교사 / 전체 팀)

### 7.2 Grade Analysis Agent

**구독 이벤트**: `grade.uploaded`, `grade.confirmed`

**워크플로우 A: 성적 업로드 시** (trigger: `grade.uploaded`)
```
[trigger: grade.uploaded]
    ↓
[process: OCR 자동 처리]
    ↓
[condition: 신뢰도 >= 임계값?]
    ├─ yes → [action: 자동 저장 (grade.confirmed 발행)]
    └─ no → [action: 교사 검토 큐 알림]
```

**워크플로우 B: 성적 확인 시** (trigger: `grade.confirmed`)
```
[trigger: grade.confirmed]
    ↓
[process: 코칭 리포트 생성]
    ↓
[process: 학부모 리포트 생성]
    ↓
[condition: 자동 발송?]
    ├─ yes → [action: 알림톡 발송]
    └─ no → [action: 교사 발송 대기 알림]
```

**설정 가능 항목:**
- OCR 자동 승인 신뢰도 임계값 (기본: 95, 범위: 80-100, 슬라이더)
- 코칭 리포트 자동 생성 여부
- 학부모 리포트 자동 발송 여부
- 알림톡 발송 시간 제한 (09:00-21:00)

### 7.3 Counseling Assistant Agent

**구독 이벤트**: `counseling.scheduled`, `counseling.completed`

**워크플로우 A: 상담 예약 시** (trigger: `counseling.scheduled`)
```
[trigger: counseling.scheduled]
    ↓
[process: 학생 성향 요약 생성]
    ↓
[process: 상담 시나리오 생성]
    ↓
[action: 교사 알림 — "상담 준비 자료가 생성되었습니다"]
```

**워크플로우 B: 상담 완료 시** (trigger: `counseling.completed`)
```
[trigger: counseling.completed]
    ↓
[process: 상담 요약 자동 생성]
    ↓
[condition: N회차 상담 도달?]
    ├─ yes → [process: 종합 상담 리포트] → [action: PDF 생성] → [action: 교사 알림]
    └─ no → [action: 요약 저장 완료 알림]
```

**설정 가능 항목:**
- 시나리오 자동 생성 여부
- 상담 요약 자동 생성 여부
- 종합 리포트 생성 주기 (N회차마다, 기본: 3)
- PDF 자동 생성 여부

## 8. UI 설계

### 8.1 에이전트 대시보드 (`/admin` → "에이전트" 탭)

Admin 탭에 `agents` 탭 추가. `admin-tabs-wrapper.tsx`의 그리드를 `grid-cols-4 lg:grid-cols-9`로 변경.

```
┌─────────────────────────────────────────────────────┐
│ AI 에이전트 관리                                      │
│ 이벤트 기반 자동화 워크플로우를 관리합니다                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 학생      │  │ 성적      │  │ 상담      │          │
│  │ 프로파일링 │  │ 분석      │  │ 어시스턴트 │          │
│  │          │  │          │  │          │          │
│  │ ● 활성    │  │ ○ 비활성  │  │ ● 활성    │          │
│  │ 성공: 42  │  │ --       │  │ 성공: 15  │          │
│  │ 실패: 2   │  │          │  │ 실패: 0   │          │
│  │          │  │          │  │          │          │
│  │ [워크플로우 보기]│ [설정]  │  │ [워크플로우 보기]│     │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────┐  ┌──────────┐                        │
│  │ 매칭      │  │ 리포트    │  (Phase 2 — 비활성)    │
│  │ 최적화    │  │ 오케스트레이터│                      │
│  │ ○ 준비중  │  │ ○ 준비중  │                        │
│  └──────────┘  └──────────┘                        │
│                                                     │
│ ─── 최근 실행 이력 ─────────────────────────────── │
│ │ 시간          │ 에이전트     │ 이벤트        │ 상태  │
│ │ 03-14 10:23  │ 프로파일링   │ student.created│ ✅   │
│ │ 03-14 10:20  │ 상담        │ counseling.done│ ✅   │
│ │ 03-14 09:55  │ 프로파일링   │ mbti.submitted │ ❌   │
└─────────────────────────────────────────────────────┘
```

### 8.2 워크플로우 에디터 (Agent 카드 클릭 시)

`'use client'` 컴포넌트. React Flow 캔버스 + 우측 설정 패널 (resizable panel).

```
┌─────────────────────────────────────────────────────────────────┐
│ ← 돌아가기    학생 프로파일링 에이전트    ● 활성   [활성화 토글]    │
├─────────────────────────────────────┬───────────────────────────┤
│                                     │                           │
│     React Flow 캔버스 ('use client') │  노드 설정 패널 (resizable) │
│                                     │                           │
│  ⚡ student.created                 │  ┌─────────────────────┐  │
│       ↓                             │  │ 노드: 사주 계산       │  │
│  ⚙ 사주 계산  ─  ⚙ 이름 분석        │  │                     │  │
│       ↓              ↓              │  │ 타입: process        │  │
│  🚀 사주 해석    🚀 이름 해석        │  │                     │  │
│       ↓              ↓              │  │ 자동 실행: ☑         │  │
│  ⚙ 완료 체크                        │  │ 타임아웃: [30초]      │  │
│       ↓                             │  │ 재시도: [3회]         │  │
│  ◆ 모든 분석 완료?                   │  │                     │  │
│   ├─yes→ 🚀 통합 프로파일            │  │ [저장]  [초기화]      │  │
│   └─no→ 🔔 부분 완료 알림            │  └─────────────────────┘  │
│                                     │                           │
├─────────────────────────────────────┴───────────────────────────┤
│ 실행 이력 (최근 10건)                                             │
│ │ #  │ 트리거          │ 시작 시간      │ 소요  │ 상태 │ 상세  │   │
│ │ 1  │ student.created │ 10:23:45      │ 2.3s │ ✅   │ [보기]│   │
│ │ 2  │ mbti.submitted  │ 10:20:12      │ 5.1s │ ✅   │ [보기]│   │
└─────────────────────────────────────────────────────────────────┘
```

**실행 상태 오버레이**: `[보기]` 클릭 시 Server Action으로 해당 `AgentNodeLog[]` 조회 → React Flow 노드에 상태 오버레이.

**SSE 실시간 업데이트**: Agent 실행 결과는 기존 SSE 채널(`/api/events`)을 통해 전달. `DIRECTOR`/`TEAM_LEADER` 역할에게만 Agent 이벤트 전달 (역할 필터링 추가).

### 8.3 노드 실행 상태 시각화

React Flow 캔버스에서 각 노드는 실행 상태에 따라 스타일 변경:

| 상태 (NodeStatus) | 노드 스타일 |
|-------------------|-----------|
| PENDING (대기) | 기본 보더, 회색 배경 |
| RUNNING (실행 중) | 파란색 보더 + pulse 애니메이션 |
| COMPLETED (성공) | 초록색 보더 + 체크 배지 |
| FAILED (실패) | 빨간색 보더 + X 배지 |
| SKIPPED (건너뜀) | 점선 보더, 반투명 |
| WAITING (대기) | 보라색 보더 + 점 애니메이션 |

### 8.4 노드 설정 패널 (타입별)

**trigger 노드:**
- 이벤트 타입 표시 (읽기 전용 — 미리 정의된 워크플로우이므로)

**process 노드:**
- 자동 실행 토글
- 타임아웃 (초, number input)
- 재시도 횟수 (number input)
- LLM 사용 시: featureType 선택 (드롭다운), 프롬프트 오버라이드 (textarea)

**condition 노드:**
- 조건 필드 표시 (읽기 전용)
- 임계값 입력 (number input 또는 slider)
- true/false 라벨

**action 노드:**
- 실행 대상 표시 (읽기 전용)
- 발송 시간 제한 (time range picker)
- 템플릿 선택 (드롭다운)

## 9. 기술 스택 추가

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@xyflow/react` | ^12 | 노드 그래프 시각화 (React Flow v12, MIT) |

워크플로우가 미리 정의되므로 노드 position을 workflow JSON에 하드코딩. dagre 자동 레이아웃 불필요.

## 10. 파일 구조

```
src/features/agents/
├── core/
│   ├── base-agent.ts           # Agent 추상 클래스
│   ├── registry.ts             # Agent 레지스트리 (싱글톤)
│   ├── workflow-engine.ts      # 워크플로우 그래프 실행 엔진
│   └── types.ts                # Agent/Workflow/Node 타입
├── definitions/
│   ├── student-profiling.ts    # 학생 프로파일링 Agent (nodeHandlers)
│   ├── grade-analysis.ts       # 성적 분석 Agent (nodeHandlers)
│   └── counseling-assistant.ts # 상담 어시스턴트 Agent (nodeHandlers)
├── workflows/
│   ├── student-profiling-workflow.ts  # 기본 워크플로우 JSON (position 포함)
│   ├── grade-analysis-workflow.ts
│   └── counseling-assistant-workflow.ts
└── __tests__/

src/lib/actions/agents/
├── config.ts                   # AgentConfig CRUD
├── execution.ts                # 실행 이력 조회
└── control.ts                  # Agent 활성화/비활성화/수동 실행

src/components/agents/
├── agent-dashboard.tsx         # 에이전트 대시보드 (카드 그리드)
├── agent-card.tsx              # 개별 Agent 카드
├── workflow-editor.tsx         # 워크플로우 에디터 페이지 (resizable panel)
├── workflow-canvas.tsx         # React Flow 캔버스 ('use client')
├── node-config-panel.tsx       # 우측 설정 패널
├── execution-history.tsx       # 실행 이력 테이블
├── execution-detail-overlay.tsx # 실행 상세 (노드별 상태 오버레이)
└── nodes/
    ├── trigger-node.tsx        # 커스텀 Trigger 노드
    ├── process-node.tsx        # 커스텀 Process 노드
    ├── condition-node.tsx      # 커스텀 Condition 노드
    └── action-node.tsx         # 커스텀 Action 노드

src/app/[locale]/(dashboard)/admin/
└── (기존 admin/page.tsx에 "agents" 탭 추가)
```

## 11. 데이터 흐름

### 11.1 Agent 실행 흐름

```
1. Server Action 실행 (예: 학생 등록)
2. eventBus.emit('student.created', { studentId, teacherId })
3. AgentRegistry가 구독된 Agent의 핸들러 실행
4. Agent.execute() 호출 (비동기, Server Action 응답을 블로킹하지 않음)
   a. 중복 실행 체크 (동일 이벤트+데이터로 RUNNING인 실행 있으면 스킵)
   b. AgentExecution 레코드 생성 (PENDING → RUNNING)
   c. 워크플로우 노드 순회 (topological order)
   d. 각 노드 실행 → AgentNodeLog 기록 (executionId+nodeId unique 제약으로 멱등성 보장)
   e. condition 노드에서 분기 결정 → false 경로는 SKIPPED
   f. 모든 노드 완료 → COMPLETED
5. SSE로 실행 결과 전달 (DIRECTOR/TEAM_LEADER에게만)
6. UI 자동 갱신
```

### 11.2 노드 설정 변경 흐름

```
1. 관리자가 워크플로우 에디터에서 노드 클릭
2. 우측 패널에 노드 설정 폼 표시
3. 설정 변경 → 저장 버튼
4. Server Action: updateAgentNodeConfig(agentId, nodeId, config)
5. AgentConfig.workflow JSON 내 해당 노드의 data.config 업데이트
6. React Flow 캔버스 리렌더
```

### 11.3 Agent 활성화/비활성화 흐름

```
1. 관리자가 활성화 토글 클릭
2. Server Action: toggleAgent(agentType, enabled)
3. AgentConfig.enabled 업데이트
4. AgentRegistry.reload() 호출 (구독 갱신)
5. UI 상태 반영
```

## 12. 시드 데이터

Agent 설치 시 5개 AgentConfig가 시드됨 (모두 비활성):
- `STUDENT_PROFILING`: 워크플로우 A+B, 기본 설정
- `GRADE_ANALYSIS`: 워크플로우 A+B, 신뢰도 95% 기본값
- `COUNSELING_ASSISTANT`: 워크플로우 A+B, 3회차 종합 리포트
- `MATCHING_OPTIMIZER`: 빈 워크플로우 (Phase 2)
- `REPORT_ORCHESTRATOR`: 빈 워크플로우 (Phase 2)

관리자가 Admin UI에서 활성화 토글로 켤 수 있음.

## 13. 에러 처리 & 안정성

- **노드 실행 실패**: 재시도(exponential backoff, 최대 3회) → 모두 실패 시 실행 FAILED + 관리자 알림
- **Agent 전체 실패**: 에러 로그 + SSE toast 알림 (DIRECTOR/TEAM_LEADER)
- **이벤트 핸들러 예외**: try-catch로 감싸서 다른 Agent에 영향 없음
- **워크플로우 JSON 파싱 실패**: 기본 워크플로우로 폴백
- **서버 재시작 시**: `AgentRegistry.initialize()`에서 RUNNING 상태 실행을 FAILED로 처리
- **동시 실행 방지**: `findRunningExecution()` 체크로 동일 이벤트의 중복 실행 스킵
- **멱등성**: `AgentNodeLog`에 `@@unique([executionId, nodeId])` 제약. 각 nodeHandler는 executionId+nodeId 기반으로 기존 결과를 체크 후 스킵

## 14. 테스트 전략

- **단위 테스트**: BaseAgent, WorkflowEngine, 각 Agent의 nodeHandlers
- **통합 테스트**: 이벤트 발행 → Agent 실행 → DB 상태 검증
- **UI 테스트**: React Flow 커스텀 노드 렌더링 (Vitest + React Testing Library)

## 15. 범위 외 (향후 고려)

- `wait` 노드 + DB 폴링 기반 재개 메커니즘
- BullMQ/Redis 기반 비동기 큐 마이그레이션
- 커스텀 워크플로우 에디터 (드래그&드롭으로 노드 추가)
- 매칭 최적화 Agent, 리포트 오케스트레이터 Agent 워크플로우 구현
- Agent 간 통신 (파이프라인 연결)
- 워크플로우 버전 관리
- A/B 테스트 (워크플로우 변형 비교)
- dagre 자동 레이아웃 (워크플로우가 복잡해질 때)
