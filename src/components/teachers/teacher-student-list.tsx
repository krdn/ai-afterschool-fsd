'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Search, FileText, MessageSquare, User } from 'lucide-react'
import Link from 'next/link'
import type { StudentWithMetrics, TeacherStudentMetrics } from '@/lib/actions/teacher/performance'

interface TeacherStudentListProps {
  teacherId: string
  students: StudentWithMetrics[]
  metrics: TeacherStudentMetrics
}

function getGradeColor(score: number): string {
  if (score < 60) return 'text-red-600 bg-red-50'
  if (score < 80) return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}

function CompatibilityProgressBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-gray-400 text-sm">-</span>
  }

  const percentage = score
  let color = 'bg-gray-200'
  if (score >= 80) color = 'bg-green-500'
  else if (score >= 60) color = 'bg-yellow-500'
  else color = 'bg-red-500'

  return (
    <div className="w-full max-w-[120px]">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium">{score.toFixed(0)}</span>
        <span className="text-gray-500">/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function LatestGradesCell({ grades }: { grades: StudentWithMetrics['latestGrades'] }) {
  if (grades.length === 0) {
    return <span className="text-gray-400 text-sm">성적 없음</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {grades.slice(0, 3).map((grade, index) => (
        <span
          key={index}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGradeColor(
            grade.normalizedScore
          )}`}
        >
          {grade.subject}: {grade.normalizedScore.toFixed(0)}
        </span>
      ))}
      {grades.length > 3 && (
        <span className="text-xs text-gray-500">+{grades.length - 3}</span>
      )}
    </div>
  )
}

export function TeacherStudentList({ students, metrics }: TeacherStudentListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')

  const columns = React.useMemo<ColumnDef<StudentWithMetrics>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            학생 이름
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <Link
              href={`/students/${row.original.id}`}
              className="font-medium hover:underline text-blue-600"
            >
              {row.getValue('name')}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: 'school',
        header: '학교',
        cell: ({ row }) => <span className="text-sm">{row.getValue('school')}</span>,
      },
      {
        accessorKey: 'grade',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            학년
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{row.getValue('grade')}학년</span>
        ),
      },
      {
        id: 'latestGrades',
        header: '최근 성적',
        cell: ({ row }) => <LatestGradesCell grades={row.original.latestGrades} />,
      },
      {
        accessorKey: 'counselingCount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            상담 횟수
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const count = row.getValue('counselingCount') as number
          return count > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              <MessageSquare className="h-3 w-3" />
              {count}회
            </span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )
        },
      },
      {
        accessorKey: 'compatibilityScore',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            궁합 점수
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <CompatibilityProgressBar score={row.original.compatibilityScore} />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            입학일
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue('createdAt'))
          return <span className="text-sm">{date.toLocaleDateString('ko-KR')}</span>
        },
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/students/${row.original.id}`}>상세 보기</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/students/${row.original.id}/grades`}>
                <FileText className="h-3 w-3 mr-1" />
                성적
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      globalFilter,
    },
  })

  const totalCount = table.getFilteredRowModel().rows.length

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <User className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">아직 배정된 학생이 없습니다</p>
        <Button asChild>
          <Link href="/matching">학생 배정하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="학생 이름, 학교로 검색..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-gray-500">
          총 {totalCount}명의 학생 (전체 {metrics.totalStudents}명)
        </p>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
