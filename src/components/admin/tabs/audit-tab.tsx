'use client'

import { useState, useEffect } from 'react'
import { getAuditLogs, type AuditLogEntry } from '@/lib/actions/admin/audit'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AuditTabProps {
  initialAction?: string
  initialPage?: number
}

function getActionColor(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-800'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-800'
    case 'DELETE':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function formatChanges(changes: Record<string, unknown> | null): string {
  if (!changes) return '-'
  const entries = Object.entries(changes)
  if (entries.length === 0) return '-'
  return entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')
}

export function AuditTab({ initialAction = 'ALL', initialPage = 1 }: AuditTabProps) {
  const [action, setAction] = useState(initialAction)
  const [page, setPage] = useState(initialPage)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    getAuditLogs({ action, page }).then(result => {
      setLogs(result.logs)
      setTotal(result.total)
    })
  }, [action, page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6" data-testid="audit-tab">
      {/* 작업 유형 필터 */}
      <div className="flex gap-2" data-testid="action-filter">
        <button
          onClick={() => { setAction('ALL'); setPage(1) }}
          className={`px-3 py-1 rounded ${action === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-all"
        >
          전체
        </button>
        <button
          onClick={() => { setAction('CREATE'); setPage(1) }}
          className={`px-3 py-1 rounded ${action === 'CREATE' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-create"
        >
          생성
        </button>
        <button
          onClick={() => { setAction('UPDATE'); setPage(1) }}
          className={`px-3 py-1 rounded ${action === 'UPDATE' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-update"
        >
          수정
        </button>
        <button
          onClick={() => { setAction('DELETE'); setPage(1) }}
          className={`px-3 py-1 rounded ${action === 'DELETE' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-delete"
        >
          삭제
        </button>
      </div>

      {/* 감사 로그 테이블 */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500" data-testid="no-logs">
          감사 로그가 없습니다.
        </div>
      ) : (
        <>
          <div className="border rounded-lg" data-testid="audit-logs-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>변경내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} data-testid="audit-log-row">
                    <TableCell data-testid="log-timestamp">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell data-testid="log-user">
                      {log.teacherName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}
                        data-testid="log-action"
                      >
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell data-testid="log-entity">
                      {log.entityType}
                      {log.entityId && <span className="text-gray-400"> ({log.entityId.slice(0, 8)}...)</span>}
                    </TableCell>
                    <TableCell>
                      <div
                        className="max-w-md truncate text-sm text-gray-600"
                        data-testid="log-changes"
                        title={formatChanges(log.changes)}
                      >
                        {formatChanges(log.changes)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex gap-2" data-testid="pagination">
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 border rounded"
                  data-testid="prev-page"
                >
                  이전
                </button>
              )}
              <span className="px-3 py-1">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border rounded"
                  data-testid="next-page"
                >
                  다음
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
