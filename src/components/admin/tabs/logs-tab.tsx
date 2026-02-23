'use client'

import { useState, useEffect } from 'react'
import { getSystemLogs, type SystemLogEntry } from '@/lib/actions/admin/system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface LogsTabProps {
  initialLevel?: string
  initialPage?: number
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'ERROR':
      return 'bg-red-100 text-red-800'
    case 'WARN':
      return 'bg-yellow-100 text-yellow-800'
    case 'INFO':
      return 'bg-blue-100 text-blue-800'
    case 'DEBUG':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function LogsTab({ initialLevel = 'ALL', initialPage = 1 }: LogsTabProps) {
  const [level, setLevel] = useState(initialLevel)
  const [page, setPage] = useState(initialPage)
  const [logs, setLogs] = useState<SystemLogEntry[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    getSystemLogs({ level, page }).then(result => {
      setLogs(result.logs)
      setTotal(result.total)
    })
  }, [level, page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6" data-testid="logs-tab">
      {/* 레벨 필터 */}
      <div className="flex gap-2" data-testid="log-level-filter">
        <button
          onClick={() => { setLevel('ALL'); setPage(1) }}
          className={`px-3 py-1 rounded ${level === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-all"
        >
          전체
        </button>
        <button
          onClick={() => { setLevel('ERROR'); setPage(1) }}
          className={`px-3 py-1 rounded ${level === 'ERROR' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-error"
        >
          ERROR
        </button>
        <button
          onClick={() => { setLevel('WARN'); setPage(1) }}
          className={`px-3 py-1 rounded ${level === 'WARN' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-warn"
        >
          WARN
        </button>
        <button
          onClick={() => { setLevel('INFO'); setPage(1) }}
          className={`px-3 py-1 rounded ${level === 'INFO' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          data-testid="filter-info"
        >
          INFO
        </button>
      </div>

      {/* 로그 테이블 */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500" data-testid="no-logs">
          로그가 없습니다.
        </div>
      ) : (
        <>
          <div className="border rounded-lg" data-testid="system-logs-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>레벨</TableHead>
                  <TableHead>메시지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} data-testid="system-log-row">
                    <TableCell data-testid="log-timestamp">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}
                        data-testid="log-level"
                      >
                        {log.level}
                      </span>
                    </TableCell>
                    <TableCell data-testid="log-message">
                      {log.message}
                      {log.context && (
                        <pre className="mt-1 text-xs text-gray-500 overflow-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      )}
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
