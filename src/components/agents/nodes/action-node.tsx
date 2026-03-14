'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { statusStyles } from './node-status-styles';

export const ActionNode = memo(function ActionNode({ data, selected }: NodeProps) {
  const d = data as { label: string; status?: string; config: Record<string, unknown> };
  const style = statusStyles[d.status ?? 'idle'];

  return (
    <div className={`rounded-lg border-2 px-4 py-3 min-w-[160px] shadow-sm transition-all ${style} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-emerald-100 p-1.5 dark:bg-emerald-900/40">
          <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-medium truncate">{d.label}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
});
