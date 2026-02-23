'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, UserMinus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { unassignStudent } from '@/lib/actions/matching/assignment'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  school: string
  grade: number
}

interface Teacher {
  id: string
  name: string
  role: string
  email: string
  students: Student[]
}

interface TeacherAssignmentTableProps {
  teachers: Teacher[]
}

const columnHelper = createColumnHelper<Teacher>()

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'TEAM_LEADER':
      return '팀장'
    case 'MANAGER':
      return '매니저'
    case 'DIRECTOR':
      return '원장'
    default:
      return '선생님'
  }
}

const getRoleBadgeClass = (role: string): string => {
  switch (role) {
    case 'TEAM_LEADER':
      return 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium'
    case 'MANAGER':
      return 'bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium'
    default:
      return 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium'
  }
}

export function TeacherAssignmentTable({ teachers }: TeacherAssignmentTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [unassigningId, setUnassigningId] = React.useState<string | null>(null)
  const [unassignDialog, setUnassignDialog] = React.useState<{
    open: boolean
    studentId: string
    studentName: string
  }>({ open: false, studentId: '', studentName: '' })

  const handleUnassignClick = (studentId: string, studentName: string) => {
    setUnassignDialog({ open: true, studentId, studentName })
  }

  const handleConfirmUnassign = async () => {
    const { studentId, studentName } = unassignDialog
    setUnassignDialog((prev) => ({ ...prev, open: false }))
    setUnassigningId(studentId)
    const result = await unassignStudent(studentId)
    if (result.success) {
      toast.success(`${studentName} 학생이 미배정 처리되었습니다.`)
      router.refresh()
    } else {
      toast.error(result.error ?? '배정 해제 중 오류가 발생했습니다.')
    }
    setUnassigningId(null)
  }

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('name', {
        header: '선생님',
        cell: (info) => (
          <div className="font-medium">
            <Link
              href={`/teachers/${info.row.original.id}`}
              className="hover:underline text-blue-600"
            >
              {info.getValue()}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('role', {
        header: '역할',
        cell: (info) => (
          <span className={getRoleBadgeClass(info.getValue())}>
            {getRoleLabel(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('students', {
        header: ({ column }) => {
          const sorted = column.getIsSorted()
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground"
              onClick={() => column.toggleSorting(sorted === 'asc')}
            >
              담당 학생
              {sorted === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : sorted === 'desc' ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
              )}
            </button>
          )
        },
        sortingFn: (rowA, rowB) =>
          rowA.original.students.length - rowB.original.students.length,
        cell: (info) => {
          const count = info.getValue().length
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium" data-testid="student-count">{count}명</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const id = info.row.original.id
                  setExpandedRows((prev) => {
                    const next = new Set(prev)
                    if (next.has(id)) {
                      next.delete(id)
                    } else {
                      next.add(id)
                    }
                    return next
                  })
                }}
              >
                {expandedRows.has(info.row.original.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          )
        },
      }),
      columnHelper.accessor('email', {
        header: '이메일',
        cell: (info) => <span className="text-gray-500">{info.getValue()}</span>,
      }),
    ],
    [expandedRows]
  )

  const table = useReactTable({
    data: teachers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const totalCount = table.getFilteredRowModel().rows.length
  const pageSize = table.getState().pagination.pageSize
  const pageIndex = table.getState().pagination.pageIndex
  const start = totalCount === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalCount)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="선생님 이름으로 검색..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
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
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && 'selected'} data-testid="teacher-assignment">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.id) && row.original.students.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-gray-50">
                        <div className="py-2">
                          <p className="text-sm font-medium mb-2">담당 학생 목록:</p>
                          <div className="space-y-1">
                            {row.original.students.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100"
                              >
                                <Link
                                  href={`/students/${student.id}`}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {student.name}
                                </Link>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-500">
                                    {student.school} {student.grade}학년
                                  </span>
                                  <button
                                    onClick={() => handleUnassignClick(student.id, student.name)}
                                    disabled={unassigningId === student.id}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                                    title="배정 해제"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                    해제
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {expandedRows.has(row.original.id) && row.original.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-gray-50">
                        <p className="text-sm text-gray-500 py-2">담당 학생이 없습니다.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  검색 결과가 없어요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          총 {totalCount}명 중 {start}-{end}명 표시
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            이전
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            다음
          </Button>
        </div>
      </div>
      {/* 배정 해제 확인 다이얼로그 */}
      <Dialog
        open={unassignDialog.open}
        onOpenChange={(open) => setUnassignDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배정 해제 확인</DialogTitle>
            <DialogDescription>
              <strong>{unassignDialog.studentName}</strong> 학생의 배정을 해제하시겠습니까?
              해제 후 미배정 상태로 전환됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnassignDialog((prev) => ({ ...prev, open: false }))}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmUnassign}>
              해제하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
