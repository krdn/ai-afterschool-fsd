import type { NodeStatus } from '@prisma/client';

export const statusStyles: Record<string, string> = {
  idle: 'border-muted-foreground/30 bg-card',
  PENDING: 'border-muted-foreground/30 bg-card',
  RUNNING: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 animate-pulse',
  COMPLETED: 'border-green-500 bg-green-50 dark:bg-green-950/20',
  FAILED: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  SKIPPED: 'border-dashed border-muted-foreground/20 opacity-50',
  WAITING: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20',
};

export const statusBadgeStyles: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  RUNNING: 'bg-blue-500',
  SKIPPED: 'bg-muted-foreground/50',
};
