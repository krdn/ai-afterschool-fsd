import type { WorkflowDefinition, WorkflowNode } from './types';

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
