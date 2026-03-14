'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { agentNodeTypes } from './nodes';
import type { WorkflowDefinition } from '@/features/agents/core/types';
import type { AgentNodeLog } from '@prisma/client';

type WorkflowCanvasProps = {
  workflow: WorkflowDefinition;
  nodeLogs?: AgentNodeLog[];
  onNodeClick?: (nodeId: string) => void;
  className?: string;
};

export function WorkflowCanvas({ workflow, nodeLogs, onNodeClick, className }: WorkflowCanvasProps) {
  const nodeStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    if (nodeLogs) {
      for (const log of nodeLogs) {
        map.set(log.nodeId, log.status);
      }
    }
    return map;
  }, [nodeLogs]);

  const nodes: Node[] = useMemo(
    () =>
      workflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { ...n.data, status: nodeStatusMap.get(n.id) },
      })),
    [workflow.nodes, nodeStatusMap]
  );

  const edges: Edge[] = useMemo(
    () =>
      workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        label: e.label,
        animated: e.animated ?? nodeStatusMap.get(e.source) === 'RUNNING',
        style: { stroke: 'hsl(var(--muted-foreground))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
      })),
    [workflow.edges, nodeStatusMap]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  return (
    <div className={`h-full w-full ${className ?? ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={agentNodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        nodesConnectable={false}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="!bg-background" />
        <Controls className="!bg-card !border !border-border !rounded-lg !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent" />
        <MiniMap className="!bg-card !border !border-border !rounded-lg" nodeColor={() => 'hsl(var(--primary))'} />
      </ReactFlow>
    </div>
  );
}
