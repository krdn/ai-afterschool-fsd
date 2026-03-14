'use client';

import { useState, useEffect } from 'react';
import { AgentCard } from './agent-card';
import { WorkflowEditor } from './workflow-editor';
import { ExecutionHistory } from './execution-history';
import { getAgentStats } from '@/lib/actions/agents/execution';
import type { AgentConfig, AgentExecution, AgentType } from '@prisma/client';

type AgentDashboardProps = {
  configs: AgentConfig[];
  recentExecutions: AgentExecution[];
};

export function AgentDashboard({ configs, recentExecutions }: AgentDashboardProps) {
  const [selectedConfig, setSelectedConfig] = useState<AgentConfig | null>(null);
  const [stats, setStats] = useState<Record<string, { total: number; completed: number; failed: number }>>({});

  useEffect(() => {
    Promise.all(
      configs.map(async (c) => {
        const result = await getAgentStats(c.type);
        if (result.success && result.data) {
          return [c.type, result.data] as const;
        }
        return null;
      })
    ).then((results) => {
      const statsMap: Record<string, { total: number; completed: number; failed: number }> = {};
      for (const r of results) {
        if (r) statsMap[r[0]] = r[1];
      }
      setStats(statsMap);
    });
  }, [configs]);

  if (selectedConfig) {
    return <WorkflowEditor config={selectedConfig} onBack={() => setSelectedConfig(null)} />;
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold">AI 에이전트 관리</h2>
        <p className="text-muted-foreground">이벤트 기반 자동화 워크플로우를 관리합니다.</p>
      </div>

      {/* Agent 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => (
          <AgentCard
            key={config.id}
            config={config}
            stats={stats[config.type]}
            onOpenWorkflow={setSelectedConfig}
          />
        ))}
      </div>

      {/* 최근 실행 이력 */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">최근 실행 이력</h3>
        <ExecutionHistory executions={recentExecutions} />
      </div>
    </div>
  );
}
