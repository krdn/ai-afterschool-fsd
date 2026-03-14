import type { AgentType } from '@prisma/client';
import type { AgentEventMap, AgentEventName } from '@/lib/events/types';

export type WorkflowNodeType = 'trigger' | 'process' | 'condition' | 'action';

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    action?: string;
    event?: string;
    config: Record<string, unknown>;
  };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  animated?: boolean;
};

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

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
