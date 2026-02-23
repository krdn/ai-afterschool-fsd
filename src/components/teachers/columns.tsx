'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'
import { TeacherDeleteDialog } from './teacher-delete-dialog'

export type Teacher = {
  id: string
  name: string
  email: string
  role: 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'
  teamId: string | null
  team: { id: string; name: string } | null
  createdAt: Date
  _count: { students: number }
}

const roleLabels: Record<Teacher['role'], string> = {
  DIRECTOR: '원장',
  TEAM_LEADER: '팀장',
  MANAGER: '매니저',
  TEACHER: '선생님',
}

type ColumnOptions = {
  currentUserId: string
  currentRole: string
}

export function getColumns({ currentUserId, currentRole }: ColumnOptions): ColumnDef<Teacher>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            이름
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <Link
          href={`/teachers/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.getValue('name')}
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            이메일
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: 'role',
      header: '역할',
      cell: ({ row }) => {
        const role = row.getValue('role') as Teacher['role']
        return roleLabels[role]
      },
    },
    {
      accessorKey: 'team',
      header: '소속 팀',
      cell: ({ row }) => {
        const team = row.original.team
        return team ? team.name : '-'
      },
    },
    {
      id: 'studentCount',
      header: '담당 학생',
      cell: ({ row }) => {
        const count = row.original._count.students
        return count > 0 ? `${count}명` : '-'
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            가입일
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return date.toLocaleDateString('ko-KR')
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const teacher = row.original
        const isCurrentUser = teacher.id === currentUserId
        const isDirector = currentRole === 'DIRECTOR'

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/teachers/${teacher.id}`}>상세보기</Link>
            </Button>
            {isDirector && !isCurrentUser && (
              <TeacherDeleteDialog
                teacherId={teacher.id}
                teacherName={teacher.name}
                variant="icon"
              />
            )}
          </div>
        )
      },
    },
  ]
}

// 기존 코드 호환용 기본 컬럼 (세션 없이 사용 시)
export const columns = getColumns({ currentUserId: '', currentRole: '' })
