'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TeacherDeleteDialog } from './teacher-delete-dialog'

type TeacherDetailActionsProps = {
  teacherId: string
  teacherName: string
  canEdit: boolean
  canDelete: boolean
}

export function TeacherDetailActions({
  teacherId,
  teacherName,
  canEdit,
  canDelete,
}: TeacherDetailActionsProps) {
  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/teachers/${teacherId}/edit`}>
            수정하기
          </Link>
        </Button>
      )}
      {canDelete && (
        <TeacherDeleteDialog
          teacherId={teacherId}
          teacherName={teacherName}
        />
      )}
    </div>
  )
}
