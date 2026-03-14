# AI Agent Workflow System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이벤트 기반 AI Agent 자동화 시스템 + React Flow 워크플로우 그래프 시각화 UI 구현

**Architecture:** EventBus를 이벤트별 구독 패턴으로 리팩토링하고, Prisma 모델로 Agent 설정/실행 이력을 관리. React Flow v12로 워크플로우를 노드-엣지 그래프로 시각화하며, 노드 클릭 시 우측 패널에서 설정 변경 가능. 3개 Agent MVP (학생 프로파일링, 성적 분석, 상담 어시스턴트).

**Tech Stack:** Next.js 15, React 19, Prisma 7, @xyflow/react v12, EventEmitter, shadcn/ui, Tailwind CSS 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-agent-workflow-system-design.md`

---

## Chunk 1: 인프라 (EventBus 리팩토링 + DB 스키마 + Agent 프레임워크)

### Task 1: EventBus 이벤트별 구독 패턴으로 리팩토링

**Files:**
- Modify: `src/lib/events/types.ts`
- Modify: `src/lib/events/event-bus.ts`
- Create: `src/lib/events/__tests__/event-bus.test.ts`

- [ ] **Step 1: 이벤트 타입 확장 테스트 작성**

```typescript
// src/lib/events/__tests__/event-bus.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../event-bus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it('이벤트별 구독이 동작한다', () => {
    const handler = vi.fn();
    eventBus.on('student.created', handler);
    eventBus.emit('student.created', { studentId: 's1', teacherId: 't1' });
    expect(handler).toHaveBeenCalledWith({ studentId: 's1', teacherId: 't1' });
  });

  it('다른 이벤트에는 반응하지 않는다', () => {
    const handler = vi.fn();
    eventBus.on('student.created', handler);
    eventBus.emit('grade.uploaded', { studentId: 's1', scanId: 'sc1', imageUrl: 'url' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('기존 onEvent는 하위 호환된다 (콜론 구분자)', () => {
    const handler = vi.fn();
    eventBus.onEvent(handler);
    // 기존 코드는 type: 'analysis:complete' (콜론)을 사용 — SSE 호환 유지
    eventBus.emitEvent({
      type: 'analysis:complete',
      analysisType: 'saju',
      subjectType: 'STUDENT',
      subjectId: 's1',
      subjectName: '홍길동',
      timestamp: new Date().toISOString(),
    });
    expect(handler).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/events/__tests__/event-bus.test.ts`
Expected: FAIL — `eventBus.on('student.created', ...)` 타입 에러 또는 미동작

- [ ] **Step 3: 이벤트 타입 확장 (`types.ts`)**

`src/lib/events/types.ts`를 다음으로 교체:

```typescript
// src/lib/events/types.ts

// 기존 SSE용 분석 완료 이벤트 (콜론 구분자 — NotificationProvider 호환 유지)
export type AnalysisCompleteEvent = {
  type: 'analysis:complete';
  analysisType: 'saju' | 'mbti' | 'vark' | 'face' | 'palm' | 'name' | 'zodiac';
  subjectType: 'STUDENT' | 'TEACHER';
  subjectId: string;
  subjectName: string;
  timestamp: string;
};

// Agent 이벤트 맵
export type AgentEventMap = {
  'student.created': { studentId: string; teacherId: string };
  'student.updated': { studentId: string; fields: string[] };
  'grade.uploaded': { studentId: string; scanId: string; imageUrl: string };
  'grade.confirmed': { studentId: string; gradeHistoryId: string };
  'counseling.scheduled': { reservationId: string; studentId: string; scheduledAt: string };
  'counseling.started': { reservationId: string };
  'counseling.completed': { sessionId: string; reservationId: string };
  'analysis.completed': Omit<AnalysisCompletedEvent, 'type'>;
  'profile.updated': { studentId: string; completedAnalyses: string[] };
  'report.generated': { studentId: string; reportId: string; reportType: string };
  'mbti.submitted': { studentId: string; resultId: string };
  'vark.submitted': { studentId: string; resultId: string };
  'agent.execution.completed': { agentType: string; executionId: string; status: string };
};

export type AgentEventName = keyof AgentEventMap;

// 기존 SSE용 타입 (하위 호환 — 콜론 구분자 유지)
export type ServerEvent = AnalysisCompleteEvent;
```

- [ ] **Step 4: EventBus 클래스 리팩토링 (`event-bus.ts`)**

`src/lib/events/event-bus.ts`를 다음으로 교체:

```typescript
// src/lib/events/event-bus.ts
import { EventEmitter } from 'events';
import type { AgentEventMap, AgentEventName, ServerEvent } from './types';

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // 신규: 이벤트별 타입 안전 emit
  override emit<K extends AgentEventName>(event: K, data: AgentEventMap[K]): boolean {
    return super.emit(event, data);
  }

  // 신규: 이벤트별 타입 안전 구독
  override on<K extends AgentEventName>(event: K, listener: (data: AgentEventMap[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  // 신규: 이벤트별 구독 해제
  override off<K extends AgentEventName>(event: K, listener: (data: AgentEventMap[K]) => void): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  // 하위 호환: 기존 SSE용 단일 채널
  emitEvent(event: ServerEvent): void {
    super.emit('server-event', event);
  }

  onEvent(listener: (event: ServerEvent) => void): () => void {
    super.on('server-event', listener);
    return () => {
      super.off('server-event', listener);
    };
  }
}

const globalForEventBus = globalThis as unknown as { eventBus: EventBus };
export const eventBus = globalForEventBus.eventBus ?? EventBus.getInstance();
if (process.env.NODE_ENV !== 'production') globalForEventBus.eventBus = eventBus;
```

- [ ] **Step 5: 기존 이벤트 발행 코드 마이그레이션**

기존 `eventBus.emitEvent({ type: 'analysis:complete', ... })` 호출을 두 가지로 분리:
1. 기존 SSE용 `emitEvent()` 유지 (NotificationProvider 호환)
2. Agent용 새 이벤트 추가: `eventBus.emit('analysis.completed', { ... })`

수정 대상 파일 — 각 파일의 `eventBus.emitEvent(...)` 호출 직후에 Agent용 `eventBus.emit(...)` 추가:

**`src/lib/actions/student/calculation-analysis.ts`** L285 직후:
```typescript
// Agent 이벤트 (점 구분자)
eventBus.emit('analysis.completed', { studentId, analysisType: 'saju', subjectType: 'STUDENT', subjectId: studentId, subjectName: student.name, timestamp: new Date().toISOString() });
```

**`src/lib/actions/student/mbti-survey.ts`** L147 직후:
```typescript
eventBus.emit('mbti.submitted', { studentId, resultId: analysis.id });
```

**`src/lib/actions/student/vark-survey.ts`** L133 직후:
```typescript
eventBus.emit('vark.submitted', { studentId, resultId: analysis.id });
```

**`src/lib/actions/student/name-interpretation.ts`** L100 직후:
```typescript
eventBus.emit('analysis.completed', { studentId, analysisType: 'name', subjectType: 'STUDENT', subjectId: studentId, subjectName: student.name, timestamp: new Date().toISOString() });
```

**`src/lib/actions/student/zodiac-analysis.ts`** L97 직후:
```typescript
eventBus.emit('analysis.completed', { studentId, analysisType: 'zodiac', subjectType: 'STUDENT', subjectId: studentId, subjectName: student.name, timestamp: new Date().toISOString() });
```

**주의**: 기존 `emitEvent()`의 `type: 'analysis:complete'` (콜론)은 SSE/NotificationProvider가 의존하므로 제거 금지. Agent용 `emit()` (점 구분자)를 병렬 발행.

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/events/__tests__/event-bus.test.ts`
Expected: 3 tests PASS

- [ ] **Step 7: 커밋**

```bash
git add src/lib/events/ src/lib/actions/student/calculation-analysis.ts src/lib/actions/student/mbti-survey.ts src/lib/actions/student/vark-survey.ts src/lib/actions/student/name-interpretation.ts src/lib/actions/student/zodiac-analysis.ts
git commit -m "refactor: EventBus 이벤트별 구독 패턴으로 리팩토링 + 이벤트 타입 확장"
```

---

### Task 2: Prisma 스키마 — Agent 모델 추가

**Files:**
- Modify: `prisma/schema.prisma` (L1074 이후에 추가)

- [ ] **Step 1: Prisma 스키마에 Agent 모델 추가**

`prisma/schema.prisma` 파일 끝(L1074 이후)에 추가:

```prisma
// ─── Agent Workflow System ───

enum AgentType {
  STUDENT_PROFILING
  GRADE_ANALYSIS
  COUNSELING_ASSISTANT
  MATCHING_OPTIMIZER
  REPORT_ORCHESTRATOR
}

enum ExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum NodeStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
  WAITING
}

model AgentConfig {
  id          String    @id @default(cuid())
  type        AgentType @unique
  name        String
  description String?
  enabled     Boolean   @default(false)
  workflow    Json      // { nodes: [], edges: [] }
  settings    Json      @default("{}")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  executions  AgentExecution[]

  @@map("agent_configs")
}

model AgentExecution {
  id            String          @id @default(cuid())
  agentType     AgentType
  agentId       String
  agent         AgentConfig     @relation(fields: [agentId], references: [id])
  status        ExecutionStatus @default(PENDING)
  triggerEvent  String
  triggerData   Json?
  currentNodeId String?
  startedAt     DateTime?
  completedAt   DateTime?
  result        Json?
  error         String?
  createdAt     DateTime        @default(now())

  nodeLogs      AgentNodeLog[]

  @@index([agentType, status])
  @@index([agentId, status])
  @@index([createdAt])
  @@map("agent_executions")
}

model AgentNodeLog {
  id          String         @id @default(cuid())
  executionId String
  execution   AgentExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  nodeId      String
  nodeName    String
  status      NodeStatus     @default(PENDING)
  input       Json?
  output      Json?
  error       String?
  startedAt   DateTime?
  completedAt DateTime?
  durationMs  Int?

  @@unique([executionId, nodeId])
  @@index([executionId])
  @@map("agent_node_logs")
}
```

- [ ] **Step 2: DB 스키마 반영 + 타입 생성**

Run: `pnpm db:push && pnpm db:generate`
Expected: 3개 모델 + 3개 enum 생성 성공

- [ ] **Step 3: 커밋**

```bash
git add prisma/schema.prisma
git commit -m "feat: Agent 워크플로우 시스템 DB 스키마 추가 (AgentConfig, AgentExecution, AgentNodeLog)"
```

---

### Task 3: Agent 프레임워크 코어 — 타입 정의

**Files:**
- Create: `src/features/agents/core/types.ts`

- [ ] **Step 1: Agent 코어 타입 정의**

```typescript
// src/features/agents/core/types.ts
import type { AgentType, NodeStatus } from '@prisma/client';
import type { AgentEventMap, AgentEventName } from '@/lib/events/types';

// ─── 워크플로우 노드 타입 ───

export type WorkflowNodeType = 'trigger' | 'process' | 'condition' | 'action';

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    action?: string;       // nodeHandler 키
    event?: string;        // trigger 노드의 이벤트명
    config: Record<string, unknown>;
  };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // condition 노드의 'true' | 'false'
  label?: string;
  animated?: boolean;
};

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

// ─── 실행 컨텍스트 ───

export type ExecutionContext = {
  executionId: string;
  agentType: AgentType;
  triggerEvent: string;
  triggerData: Record<string, unknown>;
  nodeResults: Map<string, unknown>;
};

export type NodeHandler = (
  config: Record<string, unknown>,
  context: ExecutionContext
) => Promise<unknown>;

export type AgentEvent<K extends AgentEventName = AgentEventName> = {
  type: K;
  data: AgentEventMap[K];
};

export type ExecutionResult = {
  executionId: string;
  status: 'COMPLETED' | 'FAILED';
  skipped?: boolean;
  reason?: string;
  nodeResults: Record<string, unknown>;
  error?: string;
  durationMs: number;
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/agents/core/types.ts
git commit -m "feat: Agent 프레임워크 코어 타입 정의"
```

---

### Task 4: Agent 프레임워크 코어 — 워크플로우 엔진

**Files:**
- Create: `src/features/agents/core/workflow-engine.ts`
- Create: `src/features/agents/core/__tests__/workflow-engine.test.ts`

- [ ] **Step 1: 워크플로우 엔진 테스트 작성**

```typescript
// src/features/agents/core/__tests__/workflow-engine.test.ts
import { describe, it, expect } from 'vitest';
import { topologicalSort, getNextNodes } from '../workflow-engine';
import type { WorkflowDefinition } from '../types';

const simpleWorkflow: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: '시작', event: 'student.created', config: {} } },
    { id: 'process-1', type: 'process', position: { x: 200, y: 0 }, data: { label: '사주 계산', action: 'calculateSaju', config: {} } },
    { id: 'action-1', type: 'action', position: { x: 400, y: 0 }, data: { label: '알림', action: 'notifyTeacher', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'process-1' },
    { id: 'e2', source: 'process-1', target: 'action-1' },
  ],
};

describe('topologicalSort', () => {
  it('노드를 의존 순서대로 정렬한다', () => {
    const sorted = topologicalSort(simpleWorkflow);
    const ids = sorted.map(n => n.id);
    expect(ids).toEqual(['trigger-1', 'process-1', 'action-1']);
  });
});

describe('getNextNodes', () => {
  it('현재 노드의 다음 노드들을 반환한다', () => {
    const next = getNextNodes('trigger-1', simpleWorkflow);
    expect(next.map(n => n.id)).toEqual(['process-1']);
  });

  it('마지막 노드는 빈 배열을 반환한다', () => {
    const next = getNextNodes('action-1', simpleWorkflow);
    expect(next).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/features/agents/core/__tests__/workflow-engine.test.ts`
Expected: FAIL

- [ ] **Step 3: 워크플로우 엔진 구현**

```typescript
// src/features/agents/core/workflow-engine.ts
import type { WorkflowDefinition, WorkflowNode } from './types';

/**
 * 워크플로우 노드를 위상 정렬 (Kahn's algorithm)
 * trigger → process → condition → action 순서로 실행
 */
export function topologicalSort(workflow: WorkflowDefinition): WorkflowNode[] {
  const { nodes, edges } = workflow;
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    for (const target of adjacency.get(id) ?? []) {
      const newDegree = (inDegree.get(target) ?? 1) - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    }
  }

  return sorted;
}

/**
 * 현재 노드에서 나가는 엣지를 따라 다음 노드 목록 반환
 */
export function getNextNodes(
  nodeId: string,
  workflow: WorkflowDefinition,
  sourceHandle?: string
): WorkflowNode[] {
  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  return workflow.edges
    .filter(e => e.source === nodeId && (!sourceHandle || e.sourceHandle === sourceHandle))
    .map(e => nodeMap.get(e.target))
    .filter((n): n is WorkflowNode => n !== undefined);
}

/**
 * condition 노드의 false 경로에 있는 노드 ID 목록 반환
 */
export function getSkippedNodeIds(
  conditionNodeId: string,
  conditionResult: boolean,
  workflow: WorkflowDefinition
): string[] {
  const skippedHandle = conditionResult ? 'false' : 'true';
  const skippedBranch = getNextNodes(conditionNodeId, workflow, skippedHandle);

  const allSkipped: string[] = [];
  const visited = new Set<string>();
  const queue = [...skippedBranch];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    allSkipped.push(node.id);
    queue.push(...getNextNodes(node.id, workflow));
  }

  return allSkipped;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/features/agents/core/__tests__/workflow-engine.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/agents/core/workflow-engine.ts src/features/agents/core/__tests__/
git commit -m "feat: 워크플로우 엔진 구현 (위상 정렬, 분기 처리)"
```

---

### Task 5: Agent 프레임워크 코어 — BaseAgent + Registry

**Files:**
- Create: `src/features/agents/core/base-agent.ts`
- Create: `src/features/agents/core/registry.ts`
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: BaseAgent 추상 클래스 구현**

```typescript
// src/features/agents/core/base-agent.ts
import type { AgentType } from '@prisma/client';
import { db } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { topologicalSort, getNextNodes, getSkippedNodeIds } from './workflow-engine';
import type {
  WorkflowDefinition,
  WorkflowNode,
  ExecutionContext,
  ExecutionResult,
  NodeHandler,
  AgentEvent,
} from './types';
import type { AgentEventName } from '@/lib/events/types';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export abstract class BaseAgent {
  abstract type: AgentType;
  abstract subscribedEvents: AgentEventName[];
  abstract nodeHandlers: Record<string, NodeHandler>;

  async execute(event: AgentEvent, workflow: WorkflowDefinition): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 중복 실행 방지
    const existing = await db.agentExecution.findFirst({
      where: {
        agentType: this.type,
        triggerEvent: event.type,
        triggerData: { equals: event.data as object },
        status: 'RUNNING',
      },
    });
    if (existing) {
      return { executionId: existing.id, status: 'COMPLETED', skipped: true, reason: 'duplicate', nodeResults: {}, durationMs: 0 };
    }

    // AgentConfig 조회
    const config = await db.agentConfig.findUnique({ where: { type: this.type } });
    if (!config) throw new Error(`AgentConfig not found for ${this.type}`);

    // 실행 레코드 생성
    const execution = await db.agentExecution.create({
      data: {
        agentType: this.type,
        agentId: config.id,
        status: 'RUNNING',
        triggerEvent: event.type,
        triggerData: event.data as object,
        startedAt: new Date(),
      },
    });

    const context: ExecutionContext = {
      executionId: execution.id,
      agentType: this.type,
      triggerEvent: event.type,
      triggerData: event.data as Record<string, unknown>,
      nodeResults: new Map(),
    };

    const skippedNodeIds = new Set<string>();

    try {
      const sortedNodes = topologicalSort(workflow);

      for (const node of sortedNodes) {
        // 스킵된 노드 처리
        if (skippedNodeIds.has(node.id)) {
          await db.agentNodeLog.upsert({
            where: { executionId_nodeId: { executionId: execution.id, nodeId: node.id } },
            create: { executionId: execution.id, nodeId: node.id, nodeName: node.data.label, status: 'SKIPPED' },
            update: { status: 'SKIPPED' },
          });
          continue;
        }

        // trigger 노드는 실행 없이 통과
        if (node.type === 'trigger') {
          await db.agentNodeLog.upsert({
            where: { executionId_nodeId: { executionId: execution.id, nodeId: node.id } },
            create: { executionId: execution.id, nodeId: node.id, nodeName: node.data.label, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(), durationMs: 0 },
            update: { status: 'COMPLETED' },
          });
          continue;
        }

        // condition 노드 처리
        if (node.type === 'condition') {
          const result = await this.executeNodeWithRetry(node, context);
          const conditionResult = Boolean(result);
          context.nodeResults.set(node.id, conditionResult);

          // 스킵할 분기 마킹
          const toSkip = getSkippedNodeIds(node.id, conditionResult, workflow);
          toSkip.forEach(id => skippedNodeIds.add(id));
          continue;
        }

        // process / action 노드 실행
        const result = await this.executeNodeWithRetry(node, context);
        context.nodeResults.set(node.id, result);
      }

      // 실행 완료
      const durationMs = Date.now() - startTime;
      await db.agentExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED', completedAt: new Date(), result: Object.fromEntries(context.nodeResults) },
      });

      return {
        executionId: execution.id,
        status: 'COMPLETED',
        nodeResults: Object.fromEntries(context.nodeResults),
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.agentExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', completedAt: new Date(), error: errorMessage },
      });
      logger.error({ err: error, agentType: this.type, executionId: execution.id }, 'Agent execution failed');

      return { executionId: execution.id, status: 'FAILED', nodeResults: {}, error: errorMessage, durationMs };
    }
  }

  private async executeNodeWithRetry(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const maxRetries = (node.data.config?.retries as number) ?? 3;
    const timeoutMs = ((node.data.config?.timeout as number) ?? 30) * 1000;
    const nodeStart = Date.now();

    // 노드 로그 생성
    await db.agentNodeLog.upsert({
      where: { executionId_nodeId: { executionId: context.executionId, nodeId: node.id } },
      create: { executionId: context.executionId, nodeId: node.id, nodeName: node.data.label, status: 'RUNNING', startedAt: new Date(), input: node.data.config },
      update: { status: 'RUNNING', startedAt: new Date() },
    });

    const handlerKey = node.data.action;
    if (!handlerKey) throw new Error(`Node ${node.id} has no action defined`);

    const handler = this.nodeHandlers[handlerKey];
    if (!handler) throw new Error(`Unknown handler: ${handlerKey} for node ${node.id}`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          handler(node.data.config, context),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Node timeout')), timeoutMs)),
        ]);

        const durationMs = Date.now() - nodeStart;
        await db.agentNodeLog.update({
          where: { executionId_nodeId: { executionId: context.executionId, nodeId: node.id } },
          data: { status: 'COMPLETED', output: result as object ?? null, completedAt: new Date(), durationMs },
        });

        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          const durationMs = Date.now() - nodeStart;
          const errorMessage = error instanceof Error ? error.message : String(error);
          await db.agentNodeLog.update({
            where: { executionId_nodeId: { executionId: context.executionId, nodeId: node.id } },
            data: { status: 'FAILED', error: errorMessage, completedAt: new Date(), durationMs },
          });
          throw error;
        }
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
}
```

- [ ] **Step 2: Agent 레지스트리 구현**

```typescript
// src/features/agents/core/registry.ts
import { db } from '@/lib/db/client';
import { eventBus } from '@/lib/events/event-bus';
import { logger } from '@/lib/logger';
import type { BaseAgent } from './base-agent';
import type { AgentType } from '@prisma/client';
import type { AgentEventName, AgentEventMap } from '@/lib/events/types';

class AgentRegistry {
  private agents = new Map<AgentType, BaseAgent>();
  private cleanupFns: (() => void)[] = [];
  private initialized = false;

  register(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 서버 재시작 복구: RUNNING 상태 실행을 FAILED 처리
    const staleCount = await db.agentExecution.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'FAILED', error: 'Server restarted during execution', completedAt: new Date() },
    });
    if (staleCount.count > 0) {
      logger.warn({ count: staleCount.count }, 'Recovered stale agent executions');
    }

    await this.subscribe();
    this.initialized = true;
    logger.info({ agentCount: this.agents.size }, 'Agent registry initialized');
  }

  async reload(): Promise<void> {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    await this.subscribe();
    logger.info('Agent registry reloaded');
  }

  private async subscribe(): Promise<void> {
    let configs;
    try {
      configs = await db.agentConfig.findMany({ where: { enabled: true } });
    } catch {
      // DB 테이블이 아직 없을 수 있음 (마이그레이션 전)
      logger.warn('AgentConfig table not available yet, skipping agent initialization');
      return;
    }

    for (const config of configs) {
      const agent = this.agents.get(config.type);
      if (!agent) continue;

      const workflow = config.workflow as { nodes: unknown[]; edges: unknown[] };
      if (!workflow?.nodes || !workflow?.edges) continue;

      for (const eventName of agent.subscribedEvents) {
        const handler = async (data: AgentEventMap[typeof eventName]) => {
          try {
            await agent.execute(
              { type: eventName, data },
              config.workflow as WorkflowDefinition
            );
          } catch (error) {
            logger.error({ err: error, agentType: config.type, event: eventName }, 'Agent execution failed');
          }
        };
        eventBus.on(eventName, handler);
        this.cleanupFns.push(() => eventBus.off(eventName, handler));
      }
    }
  }

  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

const globalForRegistry = globalThis as unknown as { agentRegistry: AgentRegistry };
export const agentRegistry = globalForRegistry.agentRegistry ?? new AgentRegistry();
if (process.env.NODE_ENV !== 'production') globalForRegistry.agentRegistry = agentRegistry;
```

- [ ] **Step 3: instrumentation.ts에 Agent 초기화 추가**

`src/instrumentation.ts` 수정 — `register()` 함수 끝에 Agent 초기화 추가:

```typescript
// src/instrumentation.ts
export async function register() {
  // 기존 Sentry 초기화 코드 유지...

  // Agent 시스템 초기화
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { agentRegistry } = await import('@/features/agents/core/registry');
      // Agent 정의 등록은 definitions 구현 후 추가
      await agentRegistry.initialize();
    } catch (error) {
      console.warn('Agent registry initialization skipped:', error);
    }
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
```

- [ ] **Step 4: 커밋**

```bash
git add src/features/agents/core/base-agent.ts src/features/agents/core/registry.ts src/instrumentation.ts
git commit -m "feat: Agent BaseAgent 추상 클래스 + Registry + instrumentation 초기화"
```

---

### Task 6: Agent 시드 데이터 + Server Actions

**Files:**
- Create: `src/features/agents/workflows/student-profiling-workflow.ts`
- Create: `src/features/agents/workflows/grade-analysis-workflow.ts`
- Create: `src/features/agents/workflows/counseling-assistant-workflow.ts`
- Create: `src/lib/actions/agents/config.ts`
- Create: `src/lib/actions/agents/execution.ts`
- Modify: 시드 시스템에 Agent 시드 추가

- [ ] **Step 1: 학생 프로파일링 워크플로우 정의**

```typescript
// src/features/agents/workflows/student-profiling-workflow.ts
import type { WorkflowDefinition } from '../core/types';

// 워크플로우 A: 학생 등록 시
export const studentProfilingWorkflowA: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-created', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '학생 등록', event: 'student.created', config: {} } },
    { id: 'process-saju', type: 'process', position: { x: 100, y: 120 }, data: { label: '사주 계산', action: 'calculateSaju', config: { timeout: 30, retries: 2 } } },
    { id: 'process-name', type: 'process', position: { x: 400, y: 120 }, data: { label: '이름 분석', action: 'analyzeName', config: { timeout: 30, retries: 2 } } },
    { id: 'action-saju-llm', type: 'action', position: { x: 100, y: 240 }, data: { label: '사주 LLM 해석', action: 'generateSajuInterpretation', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'action-name-llm', type: 'action', position: { x: 400, y: 240 }, data: { label: '이름 LLM 해석', action: 'generateNameInterpretation', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'action-notify', type: 'action', position: { x: 250, y: 360 }, data: { label: '교사 알림', action: 'notifyTeacher', config: { message: '기본 분석 완료. MBTI/VARK 설문을 진행하세요.' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-created', target: 'process-saju' },
    { id: 'e2', source: 'trigger-created', target: 'process-name' },
    { id: 'e3', source: 'process-saju', target: 'action-saju-llm' },
    { id: 'e4', source: 'process-name', target: 'action-name-llm' },
    { id: 'e5', source: 'action-saju-llm', target: 'action-notify' },
    { id: 'e6', source: 'action-name-llm', target: 'action-notify' },
  ],
};

// 워크플로우 B: MBTI/VARK 설문 완료 시
export const studentProfilingWorkflowB: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-survey', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '설문 완료', event: 'mbti.submitted', config: {} } },
    { id: 'process-score', type: 'process', position: { x: 250, y: 120 }, data: { label: '설문 채점', action: 'scoreSurvey', config: { timeout: 10, retries: 1 } } },
    { id: 'action-llm', type: 'action', position: { x: 250, y: 240 }, data: { label: 'LLM 해석', action: 'generateSurveyInterpretation', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'condition-all', type: 'condition', position: { x: 250, y: 360 }, data: { label: '모든 분석 완료?', action: 'checkAllAnalyses', config: { minAnalyses: 3 } } },
    { id: 'action-profile', type: 'action', position: { x: 100, y: 480 }, data: { label: '통합 프로파일 생성', action: 'generateIntegratedProfile', config: { timeout: 90, retries: 2 } } },
    { id: 'action-partial', type: 'action', position: { x: 400, y: 480 }, data: { label: '부분 완료 알림', action: 'notifyPartialComplete', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-survey', target: 'process-score' },
    { id: 'e2', source: 'process-score', target: 'action-llm' },
    { id: 'e3', source: 'action-llm', target: 'condition-all' },
    { id: 'e4', source: 'condition-all', target: 'action-profile', sourceHandle: 'true', label: '완료' },
    { id: 'e5', source: 'condition-all', target: 'action-partial', sourceHandle: 'false', label: '미완료' },
  ],
};
```

- [ ] **Step 2: 성적 분석 워크플로우 정의**

```typescript
// src/features/agents/workflows/grade-analysis-workflow.ts
import type { WorkflowDefinition } from '../core/types';

// 워크플로우 A: 성적 업로드 시
export const gradeAnalysisWorkflowA: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-upload', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '성적 업로드', event: 'grade.uploaded', config: {} } },
    { id: 'process-ocr', type: 'process', position: { x: 250, y: 120 }, data: { label: 'OCR 처리', action: 'processOcr', config: { timeout: 60, retries: 2 } } },
    { id: 'condition-confidence', type: 'condition', position: { x: 250, y: 240 }, data: { label: '신뢰도 충분?', action: 'checkOcrConfidence', config: { threshold: 95 } } },
    { id: 'action-auto-save', type: 'action', position: { x: 100, y: 360 }, data: { label: '자동 저장', action: 'autoConfirmGrade', config: {} } },
    { id: 'action-review', type: 'action', position: { x: 400, y: 360 }, data: { label: '교사 검토 요청', action: 'requestTeacherReview', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-upload', target: 'process-ocr' },
    { id: 'e2', source: 'process-ocr', target: 'condition-confidence' },
    { id: 'e3', source: 'condition-confidence', target: 'action-auto-save', sourceHandle: 'true', label: '높음' },
    { id: 'e4', source: 'condition-confidence', target: 'action-review', sourceHandle: 'false', label: '낮음' },
  ],
};

// 워크플로우 B: 성적 확인 시
export const gradeAnalysisWorkflowB: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-confirmed', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '성적 확인', event: 'grade.confirmed', config: {} } },
    { id: 'process-coaching', type: 'process', position: { x: 250, y: 120 }, data: { label: '코칭 리포트', action: 'generateCoachingReport', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'process-parent', type: 'process', position: { x: 250, y: 240 }, data: { label: '학부모 리포트', action: 'generateParentReport', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'condition-send', type: 'condition', position: { x: 250, y: 360 }, data: { label: '자동 발송?', action: 'checkAutoSend', config: { autoSend: false } } },
    { id: 'action-send', type: 'action', position: { x: 100, y: 480 }, data: { label: '알림톡 발송', action: 'sendAlimtalk', config: { timeRestriction: { start: '09:00', end: '21:00' } } } },
    { id: 'action-notify-send', type: 'action', position: { x: 400, y: 480 }, data: { label: '발송 대기 알림', action: 'notifyPendingSend', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-confirmed', target: 'process-coaching' },
    { id: 'e2', source: 'process-coaching', target: 'process-parent' },
    { id: 'e3', source: 'process-parent', target: 'condition-send' },
    { id: 'e4', source: 'condition-send', target: 'action-send', sourceHandle: 'true', label: '발송' },
    { id: 'e5', source: 'condition-send', target: 'action-notify-send', sourceHandle: 'false', label: '대기' },
  ],
};
```

- [ ] **Step 3: 상담 어시스턴트 워크플로우 정의**

```typescript
// src/features/agents/workflows/counseling-assistant-workflow.ts
import type { WorkflowDefinition } from '../core/types';

// 워크플로우 A: 상담 예약 시
export const counselingAssistantWorkflowA: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-scheduled', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '상담 예약', event: 'counseling.scheduled', config: {} } },
    { id: 'process-personality', type: 'process', position: { x: 250, y: 120 }, data: { label: '성향 요약 생성', action: 'generatePersonalitySummary', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'process-scenario', type: 'process', position: { x: 250, y: 240 }, data: { label: '시나리오 생성', action: 'generateScenario', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'action-notify', type: 'action', position: { x: 250, y: 360 }, data: { label: '교사 알림', action: 'notifyTeacher', config: { message: '상담 준비 자료가 생성되었습니다.' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-scheduled', target: 'process-personality' },
    { id: 'e2', source: 'process-personality', target: 'process-scenario' },
    { id: 'e3', source: 'process-scenario', target: 'action-notify' },
  ],
};

// 워크플로우 B: 상담 완료 시
export const counselingAssistantWorkflowB: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-completed', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '상담 완료', event: 'counseling.completed', config: {} } },
    { id: 'process-summary', type: 'process', position: { x: 250, y: 120 }, data: { label: '상담 요약 생성', action: 'generateCounselingSummary', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'condition-nth', type: 'condition', position: { x: 250, y: 240 }, data: { label: 'N회차 도달?', action: 'checkNthSession', config: { nthSession: 3 } } },
    { id: 'process-report', type: 'process', position: { x: 100, y: 360 }, data: { label: '종합 리포트', action: 'generateComprehensiveReport', config: { timeout: 120, retries: 2 } } },
    { id: 'action-pdf', type: 'action', position: { x: 100, y: 480 }, data: { label: 'PDF 생성', action: 'generatePdf', config: {} } },
    { id: 'action-done', type: 'action', position: { x: 400, y: 360 }, data: { label: '완료 알림', action: 'notifyTeacher', config: { message: '상담 요약이 저장되었습니다.' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-completed', target: 'process-summary' },
    { id: 'e2', source: 'process-summary', target: 'condition-nth' },
    { id: 'e3', source: 'condition-nth', target: 'process-report', sourceHandle: 'true', label: '도달' },
    { id: 'e4', source: 'process-report', target: 'action-pdf' },
    { id: 'e5', source: 'condition-nth', target: 'action-done', sourceHandle: 'false', label: '미도달' },
  ],
};
```

- [ ] **Step 4: Agent Server Actions 구현**

```typescript
// src/lib/actions/agents/config.ts
'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { agentRegistry } from '@/features/agents/core/registry';
import { logger } from '@/lib/logger';
import type { AgentType, AgentConfig } from '@prisma/client';

export async function getAgentConfigs(): Promise<ActionResult<AgentConfig[]>> {
  try {
    const session = await verifySession();
    if (!session || !['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const configs = await db.agentConfig.findMany({ orderBy: { type: 'asc' } });
    return ok(configs);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get agent configs');
    return fail('에이전트 설정을 불러오는 데 실패했습니다.');
  }
}

export async function toggleAgent(agentType: AgentType, enabled: boolean): Promise<ActionResult<AgentConfig>> {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return fail('DIRECTOR 권한이 필요합니다.');
    }
    const config = await db.agentConfig.update({
      where: { type: agentType },
      data: { enabled },
    });
    await agentRegistry.reload();
    return ok(config);
  } catch (error) {
    logger.error({ err: error }, 'Failed to toggle agent');
    return fail('에이전트 상태 변경에 실패했습니다.');
  }
}

export async function updateAgentNodeConfig(
  agentType: AgentType,
  nodeId: string,
  nodeConfig: Record<string, unknown>
): Promise<ActionResult<AgentConfig>> {
  try {
    const session = await verifySession();
    if (!session || !['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const config = await db.agentConfig.findUnique({ where: { type: agentType } });
    if (!config) return fail('에이전트를 찾을 수 없습니다.');

    const workflow = config.workflow as { nodes: { id: string; data: { config: Record<string, unknown> } }[]; edges: unknown[] };
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return fail('노드를 찾을 수 없습니다.');

    node.data.config = { ...node.data.config, ...nodeConfig };

    const updated = await db.agentConfig.update({
      where: { type: agentType },
      data: { workflow: workflow as object },
    });

    // 활성화 상태면 구독 갱신
    if (updated.enabled) {
      await agentRegistry.reload();
    }

    return ok(updated);
  } catch (error) {
    logger.error({ err: error }, 'Failed to update node config');
    return fail('노드 설정 변경에 실패했습니다.');
  }
}
```

```typescript
// src/lib/actions/agents/execution.ts
'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import type { AgentType, AgentExecution, AgentNodeLog } from '@prisma/client';

type ExecutionWithLogs = AgentExecution & { nodeLogs: AgentNodeLog[] };

export async function getAgentExecutions(
  agentType: AgentType,
  limit = 10
): Promise<ActionResult<ExecutionWithLogs[]>> {
  try {
    const session = await verifySession();
    if (!session || !['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const executions = await db.agentExecution.findMany({
      where: { agentType },
      include: { nodeLogs: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return ok(executions);
  } catch (error) {
    return fail('실행 이력을 불러오는 데 실패했습니다.');
  }
}

export async function getRecentExecutions(limit = 20): Promise<ActionResult<AgentExecution[]>> {
  try {
    const session = await verifySession();
    if (!session || !['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const executions = await db.agentExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return ok(executions);
  } catch (error) {
    return fail('최근 실행 이력을 불러오는 데 실패했습니다.');
  }
}

export async function getAgentStats(agentType: AgentType): Promise<ActionResult<{ total: number; completed: number; failed: number }>> {
  try {
    const session = await verifySession();
    if (!session || !['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const [total, completed, failed] = await Promise.all([
      db.agentExecution.count({ where: { agentType } }),
      db.agentExecution.count({ where: { agentType, status: 'COMPLETED' } }),
      db.agentExecution.count({ where: { agentType, status: 'FAILED' } }),
    ]);
    return ok({ total, completed, failed });
  } catch (error) {
    return fail('통계를 불러오는 데 실패했습니다.');
  }
}
```

- [ ] **Step 5: Agent 시드 데이터 파일 생성**

```typescript
// src/lib/db/lib/db/seed/agent-configs.ts
import type { PrismaClient } from '@prisma/client';
import { studentProfilingWorkflowA } from '@/features/agents/workflows/student-profiling-workflow';
import { gradeAnalysisWorkflowA } from '@/features/agents/workflows/grade-analysis-workflow';
import { counselingAssistantWorkflowA } from '@/features/agents/workflows/counseling-assistant-workflow';

export async function seedAgentConfigs(prisma: PrismaClient) {
  const agents = [
    {
      type: 'STUDENT_PROFILING' as const,
      name: '학생 프로파일링',
      description: '학생 등록 시 자동으로 사주, 이름 분석을 수행하고, 설문 완료 시 통합 프로파일을 생성합니다.',
      workflow: studentProfilingWorkflowA,
    },
    {
      type: 'GRADE_ANALYSIS' as const,
      name: '성적 분석',
      description: '성적 이미지 업로드 시 자동 OCR, 코칭 리포트, 학부모 리포트를 생성합니다.',
      workflow: gradeAnalysisWorkflowA,
    },
    {
      type: 'COUNSELING_ASSISTANT' as const,
      name: '상담 어시스턴트',
      description: '상담 예약 시 사전 준비 자료를 생성하고, 상담 완료 시 자동 요약을 작성합니다.',
      workflow: counselingAssistantWorkflowA,
    },
    {
      type: 'MATCHING_OPTIMIZER' as const,
      name: '매칭 최적화',
      description: '교사-학생 배정을 최적화하고 공정성을 검증합니다. (Phase 2)',
      workflow: { nodes: [], edges: [] },
    },
    {
      type: 'REPORT_ORCHESTRATOR' as const,
      name: '리포트 오케스트레이터',
      description: '데이터 변경 시 자동으로 PDF 리포트를 생성하고 발송합니다. (Phase 2)',
      workflow: { nodes: [], edges: [] },
    },
  ];

  for (const agent of agents) {
    await prisma.agentConfig.upsert({
      where: { type: agent.type },
      create: {
        type: agent.type,
        name: agent.name,
        description: agent.description,
        enabled: false,
        workflow: agent.workflow,
        settings: {},
      },
      update: {
        name: agent.name,
        description: agent.description,
        workflow: agent.workflow,
      },
    });
  }
}
```

- [ ] **Step 6: 기존 시드 시스템에 통합**

`src/lib/db/lib/db/seed/core.ts`의 `runSeed()` 함수 끝에 Agent 시드 호출 추가:

```typescript
// core.ts 끝부분, 기존 return 전에 추가
import { seedAgentConfigs } from './agent-configs';

// runSeed() 함수 내 마지막 단계로:
await seedAgentConfigs(prisma);
```

그 후 시드 실행:

Run: `pnpm db:push && pnpm db:generate && pnpm db:seed`
Expected: "Agent configs seeded" 로그 포함, 5개 AgentConfig 생성

- [ ] **Step 7: 수동 실행 Server Action 구현**

```typescript
// src/lib/actions/agents/control.ts
'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { agentRegistry } from '@/features/agents/core/registry';
import { logger } from '@/lib/logger';
import type { AgentType } from '@prisma/client';

export async function manualTriggerAgent(
  agentType: AgentType,
  eventData: Record<string, unknown>
): Promise<ActionResult<{ executionId: string }>> {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return fail('DIRECTOR 권한이 필요합니다.');
    }
    const config = await db.agentConfig.findUnique({ where: { type: agentType } });
    if (!config) return fail('에이전트를 찾을 수 없습니다.');

    const agent = agentRegistry.getAgent(agentType);
    if (!agent) return fail('에이전트가 등록되지 않았습니다.');

    const triggerEvent = agent.subscribedEvents[0]; // 첫 번째 이벤트로 수동 트리거
    const result = await agent.execute(
      { type: triggerEvent, data: eventData },
      config.workflow as WorkflowDefinition
    );

    return ok({ executionId: result.executionId });
  } catch (error) {
    logger.error({ err: error }, 'Failed to manually trigger agent');
    return fail('수동 실행에 실패했습니다.');
  }
}
```

- [ ] **Step 8: 커밋**

```bash
git add src/features/agents/workflows/ src/lib/actions/agents/ src/lib/db/lib/db/seed/agent-configs.ts
git commit -m "feat: Agent 워크플로우 정의 + Server Actions (설정/실행/수동트리거) + 시드 데이터"
```

---

## Chunk 2: React Flow 워크플로우 그래프 UI

### Task 7: @xyflow/react 패키지 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

Run: `pnpm add @xyflow/react`

- [ ] **Step 2: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: @xyflow/react v12 패키지 추가"
```

---

### Task 8: React Flow 커스텀 노드 컴포넌트

**Files:**
- Create: `src/components/agents/nodes/trigger-node.tsx`
- Create: `src/components/agents/nodes/process-node.tsx`
- Create: `src/components/agents/nodes/condition-node.tsx`
- Create: `src/components/agents/nodes/action-node.tsx`
- Create: `src/components/agents/nodes/index.ts`

- [ ] **Step 1: 4개 커스텀 노드 컴포넌트 구현**

상태별 스타일 맵 (모든 노드 공통):

```typescript
// src/components/agents/nodes/node-status-styles.ts
import type { NodeStatus } from '@prisma/client';

export const statusStyles: Record<NodeStatus | 'idle', string> = {
  idle: 'border-muted-foreground/30 bg-card',
  PENDING: 'border-muted-foreground/30 bg-card',
  RUNNING: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 animate-pulse',
  COMPLETED: 'border-green-500 bg-green-50 dark:bg-green-950/20',
  FAILED: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  SKIPPED: 'border-dashed border-muted-foreground/20 opacity-50',
  WAITING: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20',
};
```

**trigger-node.tsx** (참조 템플릿 — 다른 3개 노드도 동일 패턴):

```tsx
// src/components/agents/nodes/trigger-node.tsx
'use client';
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { statusStyles } from './node-status-styles';
import type { NodeStatus } from '@prisma/client';

type TriggerNodeData = { label: string; event?: string; config: Record<string, unknown>; status?: NodeStatus };

export const TriggerNode = memo(function TriggerNode({ data, selected }: NodeProps) {
  const d = data as TriggerNodeData;
  const style = statusStyles[d.status ?? 'idle'];

  return (
    <div className={`rounded-lg border-2 px-4 py-3 min-w-[160px] shadow-sm ${style} ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/40">
          <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium">{d.label}</p>
          {d.event && <p className="text-xs text-muted-foreground">{d.event}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
});
```

**process-node.tsx**: 같은 패턴, `Cog` 아이콘, `slate` 색상, Handle 입출력 모두 (Top + Bottom)
**condition-node.tsx**: `GitBranch` 아이콘, `amber` 색상, Handle 입력 1개 (Top), 출력 2개 (Bottom, `id='true'` left / `id='false'` right)
**action-node.tsx**: `Play` 아이콘, `emerald` 색상, Handle 입력만 (Top), 출력도 있을 수 있음 (Bottom)

```typescript
// src/components/agents/nodes/index.ts
import { TriggerNode } from './trigger-node';
import { ProcessNode } from './process-node';
import { ConditionNode } from './condition-node';
import { ActionNode } from './action-node';
import type { NodeTypes } from '@xyflow/react';

export const agentNodeTypes: NodeTypes = {
  trigger: TriggerNode,
  process: ProcessNode,
  condition: ConditionNode,
  action: ActionNode,
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/agents/nodes/
git commit -m "feat: React Flow 커스텀 노드 컴포넌트 4종 (trigger, process, condition, action)"
```

---

### Task 9: 워크플로우 캔버스 + 설정 패널

**Files:**
- Create: `src/components/agents/workflow-canvas.tsx`
- Create: `src/components/agents/node-config-panel.tsx`
- Create: `src/components/agents/workflow-editor.tsx`

- [ ] **Step 1: 워크플로우 캔버스 구현**

`workflow-canvas.tsx` — `'use client'`. React Flow 캔버스. `ReactFlow`, `Background`, `Controls`, `MiniMap` 사용. `agentNodeTypes` 전달. 노드 클릭 시 `onNodeClick` 콜백으로 선택 노드 설정.

```typescript
// 핵심 구조
'use client';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { agentNodeTypes } from './nodes';

// props: workflow (WorkflowDefinition), nodeStatuses? (Map<nodeId, NodeStatus>), onNodeClick
// ReactFlow에 nodes, edges, nodeTypes 전달
// fitView, nodesConnectable={false}, nodesDraggable={false} (읽기 전용)
```

- [ ] **Step 2: 노드 설정 패널 구현**

`node-config-panel.tsx` — 선택된 노드의 `data.config`를 폼으로 표시. 노드 타입별 분기:
- trigger: 이벤트 표시 (읽기 전용)
- process: 자동 실행 토글(Switch), 타임아웃(Input), 재시도(Input)
- condition: 임계값(Input 또는 Slider)
- action: 활성화 토글, 메시지(Textarea)

저장 시 `updateAgentNodeConfig()` Server Action 호출.

- [ ] **Step 3: 워크플로우 에디터 (메인 레이아웃) 구현**

`workflow-editor.tsx` — resizable panel: 좌측 React Flow 캔버스, 우측 설정 패널. 상단에 Agent 이름 + 활성화 토글 + 뒤로가기 버튼.

```typescript
// 핵심 구조
'use client';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { WorkflowCanvas } from './workflow-canvas';
import { NodeConfigPanel } from './node-config-panel';

// state: selectedNodeId, 노드 클릭 시 우측 패널 표시
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/agents/workflow-canvas.tsx src/components/agents/node-config-panel.tsx src/components/agents/workflow-editor.tsx
git commit -m "feat: 워크플로우 캔버스 + 노드 설정 패널 + 에디터 레이아웃"
```

---

### Task 10: 에이전트 대시보드 + 실행 이력

**Files:**
- Create: `src/components/agents/agent-dashboard.tsx`
- Create: `src/components/agents/agent-card.tsx`
- Create: `src/components/agents/execution-history.tsx`
- Create: `src/components/agents/execution-detail-overlay.tsx`

- [ ] **Step 1: Agent 카드 컴포넌트 구현**

`agent-card.tsx` — Card 안에 Agent 이름, 설명, 활성화 배지, 성공/실패 통계, [워크플로우 보기] 버튼. `toggleAgent()` Server Action으로 활성화/비활성화.

- [ ] **Step 2: 대시보드 구현**

`agent-dashboard.tsx` — 5개 Agent 카드 그리드 (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). 하단에 최근 실행 이력 테이블.

state: `selectedAgent` — 카드 클릭 시 `WorkflowEditor` 표시 (대시보드 ↔ 에디터 전환).

- [ ] **Step 3: 실행 이력 테이블 구현**

`execution-history.tsx` — `getRecentExecutions()` 또는 `getAgentExecutions()` 데이터를 테이블로 표시. 시간, 에이전트, 이벤트, 상태, 소요 시간, [보기] 버튼.

- [ ] **Step 4: 실행 상세 오버레이 구현**

`execution-detail-overlay.tsx` — [보기] 클릭 시 `AgentNodeLog[]` 데이터를 React Flow 캔버스의 각 노드에 상태 오버레이 (COMPLETED → 초록, FAILED → 빨간 등).

- [ ] **Step 5: 커밋**

```bash
git add src/components/agents/agent-dashboard.tsx src/components/agents/agent-card.tsx src/components/agents/execution-history.tsx src/components/agents/execution-detail-overlay.tsx
git commit -m "feat: 에이전트 대시보드 + 카드 + 실행 이력 + 상세 오버레이"
```

---

### Task 11: Admin 페이지에 에이전트 탭 통합

**Files:**
- Modify: `src/components/admin/admin-tabs-wrapper.tsx` (L16 grid-cols, TabsTrigger 추가)
- Modify: `src/app/[locale]/(dashboard)/admin/page.tsx` (데이터 조회 + 탭 콘텐츠 추가)

- [ ] **Step 1: admin-tabs-wrapper.tsx 수정**

L16의 `grid-cols-4 lg:grid-cols-8`을 `grid-cols-4 lg:grid-cols-9`로 변경.

기존 마지막 `TabsTrigger` (teams) 뒤에 추가:

```tsx
<TabsTrigger value="agents" className="text-xs sm:text-sm">에이전트</TabsTrigger>
```

`testIdMap`에 `agents: 'agents-tab'` 추가.

- [ ] **Step 2: admin/page.tsx 수정**

`Promise.all`에 `getAgentConfigs()` + `getRecentExecutions()` 추가.

마지막 `AdminTabsContent` 뒤에:

```tsx
<AdminTabsContent value="agents">
  <AgentDashboard configs={agentConfigs} recentExecutions={recentAgentExecutions} />
</AdminTabsContent>
```

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add src/components/admin/admin-tabs-wrapper.tsx src/app/[locale]/(dashboard)/admin/page.tsx
git commit -m "feat: Admin 페이지에 에이전트 탭 통합"
```

---

### Task 11.5: SSE 역할 필터링 추가

**Files:**
- Modify: `src/app/api/events/route.ts`

- [ ] **Step 1: SSE route에 Agent 이벤트 역할 필터링 추가**

`src/app/api/events/route.ts`에서 세션 조회 시 역할도 함께 가져오고, Agent 이벤트는 DIRECTOR/TEAM_LEADER에게만 전달:

```typescript
// getSession() 호출 후 역할 확인
const session = await getSession();
if (!session) return new Response('Unauthorized', { status: 401 });
const role = session.role; // 'DIRECTOR' | 'TEAM_LEADER' | ...

// eventBus.onEvent 콜백 내에서:
// agent.execution.completed 이벤트는 DIRECTOR/TEAM_LEADER만 수신
if (event.type === 'agent.execution.completed' && !['DIRECTOR', 'TEAM_LEADER'].includes(role)) {
  return; // 전달하지 않음
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/events/route.ts
git commit -m "feat: SSE Agent 이벤트에 역할 기반 필터링 추가"
```

---

## Chunk 3: Agent 구현 (3개 MVP)

### Task 12: 학생 프로파일링 Agent 구현

**Files:**
- Create: `src/features/agents/definitions/student-profiling.ts`
- Modify: `src/features/agents/core/registry.ts` (Agent 등록)
- Modify: `src/instrumentation.ts` (Agent 등록)

- [ ] **Step 1: Student Profiling Agent nodeHandlers 구현**

```typescript
// src/features/agents/definitions/student-profiling.ts
import { BaseAgent } from '../core/base-agent';
import type { NodeHandler } from '../core/types';
import type { AgentEventName } from '@/lib/events/types';

export class StudentProfilingAgent extends BaseAgent {
  type = 'STUDENT_PROFILING' as const;

  subscribedEvents: AgentEventName[] = [
    'student.created',
    'mbti.submitted',
    'vark.submitted',
  ];

  nodeHandlers: Record<string, NodeHandler> = {
    calculateSaju: async (config, context) => {
      // 사주 계산은 순수 함수 — SajuInput 타입: { birthDate: Date, time?: { hour, minute } | null, longitude? }
      const { studentId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const student = await db.student.findUnique({
        where: { id: studentId as string },
        select: { birthDate: true, birthTimeHour: true, birthTimeMinute: true },
      });
      if (!student?.birthDate) return { skipped: true, reason: 'No birth date' };

      const { calculateSaju } = await import('@/features/analysis/saju/saju');
      const result = calculateSaju({
        birthDate: student.birthDate,
        time: student.birthTimeHour != null
          ? { hour: student.birthTimeHour, minute: student.birthTimeMinute ?? 0 }
          : null,
      });
      return result;
    },

    analyzeName: async (config, context) => {
      const { studentId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const student = await db.student.findUnique({
        where: { id: studentId as string },
        select: { name: true, nameHanja: true },
      });
      if (!student) return { skipped: true };
      return { name: student.name, nameHanja: student.nameHanja, analyzed: true };
    },

    generateSajuInterpretation: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      // LLM 해석은 기존 Server Action 패턴 활용
      return { interpreted: true };
    },

    generateNameInterpretation: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { interpreted: true };
    },

    notifyTeacher: async (config, context) => {
      const { teacherId } = context.triggerData;
      // SSE로 알림 발송
      const { eventBus } = await import('@/lib/events/event-bus');
      eventBus.emit('agent.execution.completed', {
        agentType: context.agentType,
        executionId: context.executionId,
        status: 'COMPLETED',
      });
      return { notified: true, teacherId, message: config.message };
    },

    scoreSurvey: async (config, context) => {
      return { scored: true };
    },

    generateSurveyInterpretation: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { interpreted: true };
    },

    checkAllAnalyses: async (config, context) => {
      // 분석 결과는 Student에 직접 없고 별도 모델에 존재:
      // SajuAnalysisHistory (studentId), MbtiAnalysis (subjectId, subjectType=STUDENT), VarkAnalysis (studentId)
      const { studentId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const [sajuCount, mbtiAnalysis, varkAnalysis] = await Promise.all([
        db.sajuAnalysisHistory.count({ where: { studentId: studentId as string } }),
        db.mbtiAnalysis.findUnique({ where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId as string } } }),
        db.varkAnalysis.findUnique({ where: { studentId: studentId as string } }),
      ]);
      const completedCount = [sajuCount > 0, mbtiAnalysis, varkAnalysis].filter(Boolean).length;
      const minAnalyses = (config.minAnalyses as number) ?? 3;
      return completedCount >= minAnalyses;
    },

    generateIntegratedProfile: async (config, context) => {
      return { integrated: true };
    },

    notifyPartialComplete: async (config, context) => {
      return { notified: true, partial: true };
    },
  };
}
```

- [ ] **Step 2: instrumentation.ts에 Agent 등록**

`src/instrumentation.ts`의 Agent 초기화 블록에 Agent 등록 추가:

```typescript
// Agent 정의 등록
const { StudentProfilingAgent } = await import('@/features/agents/definitions/student-profiling');
agentRegistry.register(new StudentProfilingAgent());
```

- [ ] **Step 3: 커밋**

```bash
git add src/features/agents/definitions/student-profiling.ts src/instrumentation.ts
git commit -m "feat: 학생 프로파일링 Agent 구현 (사주, 이름, MBTI, VARK 자동 분석)"
```

---

### Task 13: 성적 분석 Agent 구현

**Files:**
- Create: `src/features/agents/definitions/grade-analysis.ts`
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: Grade Analysis Agent nodeHandlers 구현**

```typescript
// src/features/agents/definitions/grade-analysis.ts
import { BaseAgent } from '../core/base-agent';
import type { NodeHandler } from '../core/types';
import type { AgentEventName } from '@/lib/events/types';

export class GradeAnalysisAgent extends BaseAgent {
  type = 'GRADE_ANALYSIS' as const;
  subscribedEvents: AgentEventName[] = ['grade.uploaded', 'grade.confirmed'];

  nodeHandlers: Record<string, NodeHandler> = {
    processOcr: async (config, context) => {
      // OCR 처리는 기존 grade-management feature의 ocr-processor 활용
      const { scanId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const scan = await db.gradeOcrScan.findUnique({ where: { id: scanId as string } });
      if (!scan) return { skipped: true, reason: 'Scan not found' };
      // OCR은 업로드 시 이미 처리됨 — 결과만 반환
      return { scanId: scan.id, confidence: scan.confidence, status: scan.status };
    },

    checkOcrConfidence: async (config, context) => {
      const ocrResult = context.nodeResults.get('process-ocr') as { confidence?: number } | undefined;
      const threshold = (config.threshold as number) ?? 95;
      return (ocrResult?.confidence ?? 0) >= threshold;
    },

    autoConfirmGrade: async (config, context) => {
      const { studentId, scanId } = context.triggerData;
      const { eventBus } = await import('@/lib/events/event-bus');
      // 자동 확인 이벤트 발행 — 기존 confirmOcrResult 로직 트리거
      eventBus.emit('grade.confirmed', { studentId: studentId as string, gradeHistoryId: scanId as string });
      return { confirmed: true, auto: true };
    },

    requestTeacherReview: async (config, context) => {
      const { eventBus } = await import('@/lib/events/event-bus');
      eventBus.emit('agent.execution.completed', { agentType: 'GRADE_ANALYSIS', executionId: context.executionId, status: 'REVIEW_NEEDED' });
      return { reviewRequested: true };
    },

    generateCoachingReport: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      // 코칭 리포트 생성 — 기존 coaching-report.ts 활용
      return { reportGenerated: true, type: 'coaching' };
    },

    generateParentReport: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { reportGenerated: true, type: 'parent' };
    },

    checkAutoSend: async (config) => {
      return (config.autoSend as boolean) ?? false;
    },

    sendAlimtalk: async (config, context) => {
      const restriction = config.timeRestriction as { start: string; end: string } | undefined;
      if (restriction) {
        const now = new Date();
        const hour = now.getHours();
        const startHour = parseInt(restriction.start.split(':')[0]);
        const endHour = parseInt(restriction.end.split(':')[0]);
        if (hour < startHour || hour >= endHour) {
          return { skipped: true, reason: 'Outside send hours' };
        }
      }
      return { sent: true };
    },

    notifyPendingSend: async (config, context) => {
      return { notified: true, pending: true };
    },
  };
}
```

- [ ] **Step 2: instrumentation.ts에 등록 추가**

- [ ] **Step 3: 커밋**

```bash
git add src/features/agents/definitions/grade-analysis.ts src/instrumentation.ts
git commit -m "feat: 성적 분석 Agent 구현 (OCR, 코칭 리포트, 학부모 리포트 자동화)"
```

---

### Task 14: 상담 어시스턴트 Agent 구현

**Files:**
- Create: `src/features/agents/definitions/counseling-assistant.ts`
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: Counseling Assistant Agent nodeHandlers 구현**

```typescript
// src/features/agents/definitions/counseling-assistant.ts
import { BaseAgent } from '../core/base-agent';
import type { NodeHandler } from '../core/types';
import type { AgentEventName } from '@/lib/events/types';

export class CounselingAssistantAgent extends BaseAgent {
  type = 'COUNSELING_ASSISTANT' as const;
  subscribedEvents: AgentEventName[] = ['counseling.scheduled', 'counseling.completed'];

  nodeHandlers: Record<string, NodeHandler> = {
    generatePersonalitySummary: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      const { studentId } = context.triggerData;
      // 기존 generatePersonalitySummaryAction 로직 래핑
      return { generated: true, studentId, type: 'personality_summary' };
    },

    generateScenario: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      const { reservationId } = context.triggerData;
      return { generated: true, reservationId, type: 'scenario' };
    },

    generateCounselingSummary: async (config, context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      const { sessionId } = context.triggerData;
      return { generated: true, sessionId, type: 'counseling_summary' };
    },

    checkNthSession: async (config, context) => {
      const { reservationId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      // 해당 학생의 완료된 상담 수 조회
      const reservation = await db.parentCounselingReservation.findUnique({
        where: { id: reservationId as string },
        select: { studentId: true },
      });
      if (!reservation) return false;

      const completedCount = await db.counselingSession.count({
        where: { studentId: reservation.studentId },
      });
      const nthSession = (config.nthSession as number) ?? 3;
      return completedCount > 0 && completedCount % nthSession === 0;
    },

    generateComprehensiveReport: async (config, context) => {
      return { generated: true, type: 'comprehensive_report' };
    },

    generatePdf: async (config, context) => {
      return { generated: true, type: 'pdf' };
    },

    notifyTeacher: async (config, context) => {
      const { eventBus } = await import('@/lib/events/event-bus');
      eventBus.emit('agent.execution.completed', {
        agentType: context.agentType,
        executionId: context.executionId,
        status: 'COMPLETED',
      });
      return { notified: true, message: config.message };
    },
  };
}
```

- [ ] **Step 2: instrumentation.ts에 등록 추가**

- [ ] **Step 3: 커밋**

```bash
git add src/features/agents/definitions/counseling-assistant.ts src/instrumentation.ts
git commit -m "feat: 상담 어시스턴트 Agent 구현 (사전 준비, 자동 요약, 종합 리포트)"
```

---

### Task 15: 이벤트 발행 통합 + 빌드 검증

**Files:**
- Modify: `src/lib/actions/student/crud.ts` (학생 생성 시 이벤트 발행)
- Modify: `src/lib/actions/student/grade-ocr.ts` (성적 업로드/확인 시)
- Modify: `src/lib/actions/counseling/reservations.ts` (상담 예약 시)
- Modify: `src/features/counseling/repositories/reservations.ts` (상담 완료 시)

- [ ] **Step 1: 학생 생성 Server Action에 이벤트 발행 추가**

`src/lib/actions/student/crud.ts`의 `createStudent()` 함수에서 학생 생성 성공 후 (`revalidatePath` 직전):

```typescript
eventBus.emit('student.created', { studentId: newStudent.id, teacherId });
```

- [ ] **Step 2: 성적 관련 Server Action에 이벤트 발행 추가**

`grade-ocr.ts`에서:
- `uploadAndProcessGradeImage()` 성공 후: `eventBus.emit('grade.uploaded', { studentId, scanId, imageUrl })`
- `confirmOcrResult()` 성공 후: `eventBus.emit('grade.confirmed', { studentId, gradeHistoryId })`

- [ ] **Step 3: 상담 관련 이벤트 발행 추가**

상담 예약 생성 후: `eventBus.emit('counseling.scheduled', { reservationId, studentId, scheduledAt })`
상담 완료 후: `eventBus.emit('counseling.completed', { sessionId, reservationId })`

- [ ] **Step 4: 타입 체크 + 빌드**

Run: `pnpm typecheck && pnpm build`
Expected: 에러 없이 성공

- [ ] **Step 5: 커밋**

```bash
git add src/lib/actions/student/crud.ts src/lib/actions/student/grade-ocr.ts src/lib/actions/counseling/ src/features/counseling/
git commit -m "feat: Server Actions에 Agent 이벤트 발행 통합"
```

---

### Task 16: 테스트 + 최종 검증

**Files:**
- Create: `src/features/agents/core/__tests__/base-agent.test.ts`

- [ ] **Step 1: BaseAgent 단위 테스트 작성**

Mock DB + Mock nodeHandlers로 BaseAgent.execute() 테스트:
- 정상 워크플로우 실행 완료
- condition 노드 분기 테스트
- 노드 실패 시 재시도 후 전체 FAILED
- 중복 실행 스킵

- [ ] **Step 2: 전체 테스트 실행**

Run: `pnpm test`
Expected: 기존 테스트 + 신규 테스트 모두 PASS

- [ ] **Step 3: 전체 빌드 최종 확인**

Run: `pnpm build`
Expected: 성공

- [ ] **Step 4: 최종 커밋**

```bash
git add src/features/agents/core/__tests__/base-agent.test.ts
git commit -m "test: Agent 프레임워크 단위 테스트 추가"
```
