'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { assignIssue } from '@/lib/actions/common/issues'
import { toast } from 'sonner'

interface Teacher {
  id: string
  name: string
}

export function IssueAssignSelect({
  issueId,
  currentAssigneeId,
  teachers,
}: {
  issueId: string
  currentAssigneeId: string | null
  teachers: Teacher[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAssign(teacherId: string) {
    const value = teacherId === 'UNASSIGNED' ? null : teacherId
    startTransition(async () => {
      const result = await assignIssue(issueId, value)
      if (result.success) {
        toast.success('담당자가 변경되었어요')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Select
      value={currentAssigneeId || 'UNASSIGNED'}
      onValueChange={handleAssign}
      disabled={isPending}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="담당자 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UNASSIGNED">미할당</SelectItem>
        {teachers.map((t) => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
