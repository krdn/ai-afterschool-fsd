'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'

export type Student = {
  id: string
  name: string
  school: string
  grade: number
  targetUniversity: string | null
}

export const columns: ColumnDef<Student>[] = [
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
        href={`/students/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.getValue('name')}
      </Link>
    ),
  },
  {
    accessorKey: 'school',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          학교
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'grade',
    header: '학년',
    cell: ({ row }) => `${row.getValue('grade')}학년`,
  },
  {
    accessorKey: 'targetUniversity',
    header: '목표 대학',
    cell: ({ row }) => row.getValue('targetUniversity') || '-',
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/students/${row.original.id}`}>상세보기</Link>
      </Button>
    ),
  },
]
