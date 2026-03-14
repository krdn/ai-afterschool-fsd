'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { statusStyles } from './node-status-styles';

export const ConditionNode = memo(function ConditionNode({ data, selected }: NodeProps) {
  const d = data as { label: string; status?: string; config: Record<string, unknown> };
  const style = statusStyles[d.status ?? 'idle'];

  return (
    <div className={`rounded-lg border-2 px-4 py-3 min-w-[160px] shadow-sm transition-all rotate-0 ${style} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-amber-100 p-1.5 dark:bg-amber-900/40">
          <GitBranch className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm font-medium truncate">{d.label}</p>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-background !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-background !left-[70%]" />
    </div>
  );
});
