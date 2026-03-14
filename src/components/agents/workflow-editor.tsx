'use client';

import { useState, useCallback, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { WorkflowCanvas } from './workflow-canvas';
import { NodeConfigPanel } from './node-config-panel';
import { ExecutionHistory } from './execution-history';
import { toggleAgent } from '@/lib/actions/agents/config';
import { getAgentExecutions } from '@/lib/actions/agents/execution';
import type { AgentConfig, AgentExecution, AgentNodeLog } from '@prisma/client';
import type { WorkflowDefinition, WorkflowNode } from '@/features/agents/core/types';

type WorkflowEditorProps = {
  config: AgentConfig;
  onBack: () => void;
};

export function WorkflowEditor({ config, onBack }: WorkflowEditorProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<(AgentExecution & { nodeLogs: AgentNodeLog[] })[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<(AgentExecution & { nodeLogs: AgentNodeLog[] }) | null>(null);
  const [workflowState, setWorkflowState] = useState(config.workflow as WorkflowDefinition);

  const selectedNode = selectedNodeId
    ? workflowState.nodes.find((n: WorkflowNode) => n.id === selectedNodeId) ?? null
    : null;

  useEffect(() => {
    getAgentExecutions(config.type, 10).then((result) => {
      if (result.success && result.data) {
        setExecutions(result.data);
      }
    });
  }, [config.type]);

  const handleToggle = async (checked: boolean) => {
    const result = await toggleAgent(config.type, checked);
    if (result.success) setEnabled(checked);
  };

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedExecution(null);
  }, []);

  const handleViewDetail = useCallback((execution: AgentExecution) => {
    const execWithLogs = executions.find(e => e.id === execution.id);
    if (execWithLogs) {
      setSelectedExecution(execWithLogs);
      setSelectedNodeId(null);
    }
  }, [executions]);

  const handleSaved = useCallback(() => {
    // 리프레시 -- 실제로는 revalidate가 필요하지만 클라이언트에서는 state로 관리
  }, []);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            돌아가기
          </Button>
          <h2 className="text-lg font-semibold">{config.name}</h2>
          <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? '활성' : '비활성'}</Badge>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {/* 메인 영역 */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={70} minSize={50}>
          <WorkflowCanvas
            workflow={workflowState}
            nodeLogs={selectedExecution?.nodeLogs}
            onNodeClick={handleNodeClick}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <NodeConfigPanel
            node={selectedNode}
            agentType={config.type}
            onSaved={handleSaved}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* 실행 이력 */}
      <div className="border-t p-4">
        <h3 className="mb-3 text-sm font-semibold">실행 이력 (최근 10건)</h3>
        <ExecutionHistory executions={executions} onViewDetail={handleViewDetail} />
      </div>
    </div>
  );
}
