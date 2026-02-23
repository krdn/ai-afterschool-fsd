'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatChangesForDiff } from '@/shared'
import type { AuditLogEntry } from '@/lib/actions/admin/audit'

interface AuditLogDetailDialogProps {
  log: AuditLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditLogDetailDialog({ log, open, onOpenChange }: AuditLogDetailDialogProps) {
  if (!log) return null

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (action) {
      case 'CREATE':
        return 'default'
      case 'UPDATE':
        return 'secondary'
      case 'DELETE':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getActionBadgeClass = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="audit-log-detail-dialog">
        <DialogHeader>
          <DialogTitle>변경 상세</DialogTitle>
          <DialogDescription>감사 로그의 상세 정보를 확인합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4" data-testid="change-details">
          {/* 변경 일시 */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm min-w-[80px]">변경 일시:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(log.createdAt).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>

          {/* 변경자 */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm min-w-[80px]">변경자:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{log.teacherName}</span>
              {log.ipAddress && (
                <span className="text-xs text-muted-foreground">
                  ({log.ipAddress})
                </span>
              )}
            </div>
          </div>

          {/* 변경 유형 */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm min-w-[80px]">변경 유형:</span>
            <Badge variant={getActionBadgeVariant(log.action)} className={getActionBadgeClass(log.action)}>
              {log.action}
            </Badge>
          </div>

          {/* 엔티티 정보 */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm min-w-[80px]">대상:</span>
            <span className="text-sm text-muted-foreground">
              {log.entityType}
              {log.entityId && ` (${log.entityId.slice(0, 8)}...)`}
            </span>
          </div>

          {/* 변경 내용 */}
          <div className="space-y-2">
            <span className="font-medium text-sm">변경 내용:</span>
            {log.changes ? (
              <div className="rounded-lg border bg-muted/50 p-4">
                <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                  {formatChangesForDiff(log.changes)}
                </pre>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                변경 내용이 없습니다.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
