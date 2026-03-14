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
