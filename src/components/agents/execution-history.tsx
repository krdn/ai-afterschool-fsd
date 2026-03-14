'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, Loader2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AgentExecution } from '@prisma/client';

type ExecutionHistoryProps = {
  executions: AgentExecution[];
  onViewDetail?: (execution: AgentExecution) => void;
};

const AGENT_LABELS: Record<string, string> = {
  STUDENT_PROFILING: '프로파일링',
  GRADE_ANALYSIS: '성적 분석',
  COUNSELING_ASSISTANT: '상담',
  MATCHING_OPTIMIZER: '매칭',
  REPORT_ORCHESTRATOR: '리포트',
};

const statusIcons: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  RUNNING: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
  CANCELLED: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

export function ExecutionHistory({ executions, onViewDetail }: ExecutionHistoryProps) {
  if (executions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">실행 이력이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">시간</th>
            <th className="pb-2 pr-4 font-medium">에이전트</th>
            <th className="pb-2 pr-4 font-medium">이벤트</th>
            <th className="pb-2 pr-4 font-medium">상태</th>
            <th className="pb-2 font-medium">소요</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {executions.map((exec) => {
            const duration = exec.startedAt && exec.completedAt
              ? `${((new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000).toFixed(1)}s`
              : '--';

            return (
              <tr key={exec.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {formatDistanceToNow(new Date(exec.createdAt), { addSuffix: true, locale: ko })}
                </td>
                <td className="py-2.5 pr-4">
                  <Badge variant="outline" className="text-xs">{AGENT_LABELS[exec.agentType] ?? exec.agentType}</Badge>
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs">{exec.triggerEvent}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    {statusIcons[exec.status]}
                    <span className="text-xs">{exec.status}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs">{duration}</td>
                <td className="py-2.5">
                  {onViewDetail && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onViewDetail(exec)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
