'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
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
import { getColumns, type Teacher } from './columns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type TeacherTableProps = {
  data: Teacher[]
  currentUserId: string
  currentRole: string
}

const roleLabels: Record<Teacher['role'], string> = {
  DIRECTOR: '원장',
  TEAM_LEADER: '팀장',
  MANAGER: '매니저',
  TEACHER: '선생님',
}

export function TeacherTable({ data, currentUserId, currentRole }: TeacherTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('all')
  const [teamFilter, setTeamFilter] = React.useState<string>('all')

  const columns = React.useMemo(
    () => getColumns({ currentUserId, currentRole }),
    [currentUserId, currentRole]
  )

  // 데이터에서 고유한 팀 목록 추출
  const teams = React.useMemo(() => {
    const uniqueTeams = new Map<string, string>()
    data.forEach((teacher) => {
      if (teacher.team) {
        uniqueTeams.set(teacher.team.id, teacher.team.name)
      }
    })
    return Array.from(uniqueTeams.entries()).map(([id, name]) => ({
      id,
      name,
    }))
  }, [data])

  const filteredData = React.useMemo(() => {
    return data.filter((teacher) => {
      const matchesRole =
        roleFilter === 'all' || teacher.role === roleFilter
      const matchesTeam =
        teamFilter === 'all' ||
        (teacher.team && teacher.team.id === teamFilter)
      return matchesRole && matchesTeam
    })
  }, [data, roleFilter, teamFilter])

  const table = useReactTable({
    data: filteredData,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="이름, 이메일로 검색..."
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={setRoleFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="역할 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 역할</SelectItem>
              <SelectItem value="DIRECTOR">원장</SelectItem>
              <SelectItem value="TEAM_LEADER">팀장</SelectItem>
              <SelectItem value="MANAGER">매니저</SelectItem>
              <SelectItem value="TEACHER">선생님</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={teamFilter}
            onValueChange={setTeamFilter}
            disabled={teams.length === 0}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={teams.length === 0 ? "팀 없음" : "팀 필터"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 팀</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                  검색 결과가 없어요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          총 {totalCount}명의 선생님
        </p>
      </div>
    </div>
  )
}
