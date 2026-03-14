'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Cog, GitBranch, Play, Save, RotateCcw } from 'lucide-react';
import type { WorkflowNode } from '@/features/agents/core/types';
import type { AgentType } from '@prisma/client';
import { updateAgentNodeConfig } from '@/lib/actions/agents/config';

type NodeConfigPanelProps = {
  node: WorkflowNode | null;
  agentType: AgentType;
  onSaved?: () => void;
};

const typeIcons = {
  trigger: Zap,
  process: Cog,
  condition: GitBranch,
  action: Play,
};

const typeColors = {
  trigger: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  process: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  condition: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  action: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export function NodeConfigPanel({ node, agentType, onSaved }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setConfig({ ...node.data.config });
    }
  }, [node]);

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="text-muted-foreground">
          <Cog className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">노드를 클릭하여 설정을 확인하세요</p>
        </div>
      </div>
    );
  }

  const Icon = typeIcons[node.type];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAgentNodeConfig(agentType, node.id, config);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...node.data.config });
  };

  const updateField = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* 헤더 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`rounded-md p-1.5 ${typeColors[node.type]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-semibold">{node.data.label}</h3>
          </div>
          <Badge variant="outline" className="text-xs">{node.type}</Badge>
          {node.data.event && <p className="text-xs text-muted-foreground">이벤트: {node.data.event}</p>}
          {node.data.action && <p className="text-xs text-muted-foreground">핸들러: {node.data.action}</p>}
        </div>

        <hr className="border-border" />

        {/* 타입별 설정 폼 */}
        {node.type === 'trigger' && (
          <p className="text-sm text-muted-foreground">트리거 노드는 설정할 항목이 없습니다.</p>
        )}

        {(node.type === 'process' || node.type === 'action') && (
          <div className="space-y-4">
            {config.enabled !== undefined && (
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled" className="text-sm">자동 실행</Label>
                <Switch id="enabled" checked={config.enabled as boolean} onCheckedChange={(v) => updateField('enabled', v)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="timeout" className="text-sm">타임아웃 (초)</Label>
              <Input id="timeout" type="number" min={1} max={300} value={(config.timeout as number) ?? 30} onChange={(e) => updateField('timeout', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retries" className="text-sm">재시도 횟수</Label>
              <Input id="retries" type="number" min={0} max={10} value={(config.retries as number) ?? 3} onChange={(e) => updateField('retries', Number(e.target.value))} />
            </div>
            {config.message !== undefined && (
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-sm">알림 메시지</Label>
                <Textarea id="message" value={(config.message as string) ?? ''} onChange={(e) => updateField('message', e.target.value)} rows={3} />
              </div>
            )}
          </div>
        )}

        {node.type === 'condition' && (
          <div className="space-y-4">
            {config.threshold !== undefined && (
              <div className="space-y-1.5">
                <Label htmlFor="threshold" className="text-sm">임계값</Label>
                <Input id="threshold" type="number" min={0} max={100} value={(config.threshold as number) ?? 95} onChange={(e) => updateField('threshold', Number(e.target.value))} />
              </div>
            )}
            {config.minAnalyses !== undefined && (
              <div className="space-y-1.5">
                <Label htmlFor="minAnalyses" className="text-sm">최소 분석 수</Label>
                <Input id="minAnalyses" type="number" min={1} max={10} value={(config.minAnalyses as number) ?? 3} onChange={(e) => updateField('minAnalyses', Number(e.target.value))} />
              </div>
            )}
            {config.nthSession !== undefined && (
              <div className="space-y-1.5">
                <Label htmlFor="nthSession" className="text-sm">종합 리포트 주기 (N회차)</Label>
                <Input id="nthSession" type="number" min={1} max={20} value={(config.nthSession as number) ?? 3} onChange={(e) => updateField('nthSession', Number(e.target.value))} />
              </div>
            )}
            {config.autoSend !== undefined && (
              <div className="flex items-center justify-between">
                <Label htmlFor="autoSend" className="text-sm">자동 발송</Label>
                <Switch id="autoSend" checked={config.autoSend as boolean} onCheckedChange={(v) => updateField('autoSend', v)} />
              </div>
            )}
          </div>
        )}

        {/* 저장/초기화 버튼 */}
        {node.type !== 'trigger' && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? '저장 중...' : '저장'}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              초기화
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
