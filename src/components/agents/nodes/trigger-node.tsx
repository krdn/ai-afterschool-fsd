'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { statusStyles } from './node-status-styles';

export const TriggerNode = memo(function TriggerNode({ data, selected }: NodeProps) {
  const d = data as { label: string; event?: string; status?: string; config: Record<string, unknown> };
  const style = statusStyles[d.status ?? 'idle'];

  return (
    <div className={`rounded-lg border-2 px-4 py-3 min-w-[160px] shadow-sm transition-all ${style} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/40">
          <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{d.label}</p>
          {d.event && <p className="text-xs text-muted-foreground truncate">{d.event}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
});
