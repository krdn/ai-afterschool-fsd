'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatChangesSummary } from '@/shared'
import type { AuditLogEntry } from '@/lib/actions/admin/audit'

interface MatchingAuditTableProps {
  logs: AuditLogEntry[]
  onRowClick: (log: AuditLogEntry) => void
}

export function MatchingAuditTable({ logs, onRowClick }: MatchingAuditTableProps) {
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
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100'
      case 'DELETE':
        return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-audit-logs">
        <p className="text-muted-foreground">표시할 감사 로그가 없습니다.</p>
        <p className="text-sm text-muted-foreground mt-1">필터를 조정하거나 나중에 다시 확인해주세요.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table data-testid="audit-log-table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">변경 일시</TableHead>
            <TableHead className="w-[150px]">변경자</TableHead>
            <TableHead className="w-[120px]">변경 유형</TableHead>
            <TableHead>변경 내용</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              onClick={() => onRowClick(log)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              data-testid={`audit-log-row-${log.id}`}
            >
              <TableCell className="font-mono text-xs">
                {new Date(log.createdAt).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </TableCell>
              <TableCell>{log.teacherName}</TableCell>
              <TableCell>
                <Badge variant={getActionBadgeVariant(log.action)} className={getActionBadgeClass(log.action)}>
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="max-w-md truncate" title={formatChangesSummary(log.changes, 500)}>
                {formatChangesSummary(log.changes)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
