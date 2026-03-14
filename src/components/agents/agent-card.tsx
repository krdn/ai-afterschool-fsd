'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, CheckCircle2, XCircle, Settings2 } from 'lucide-react';
import { toggleAgent } from '@/lib/actions/agents/config';
import type { AgentConfig } from '@prisma/client';

type AgentCardProps = {
  config: AgentConfig;
  stats?: { total: number; completed: number; failed: number };
  onOpenWorkflow: (config: AgentConfig) => void;
};

export function AgentCard({ config, stats, onOpenWorkflow }: AgentCardProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [toggling, setToggling] = useState(false);
  const hasWorkflow = Boolean((config.workflow as { nodes?: unknown[] })?.nodes?.length);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      const result = await toggleAgent(config.type, checked);
      if (result.success) {
        setEnabled(checked);
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card className={`transition-all ${enabled ? 'border-primary/30' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{config.name}</CardTitle>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={toggling || !hasWorkflow} />
        </div>
        {config.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{config.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
            {enabled ? '활성' : hasWorkflow ? '비활성' : '준비중'}
          </Badge>
        </div>

        {stats && stats.total > 0 && (
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>성공: {stats.completed}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span>실패: {stats.failed}</span>
            </div>
          </div>
        )}

        {hasWorkflow && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenWorkflow(config)}>
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            워크플로우 보기
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
