'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, GraduationCap } from 'lucide-react'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { removeTargetAction, updateTargetStatusAction } from '@/lib/actions/admission/student-target'
import { AdmissionProbabilityCard } from './admission-probability-card'
import type { StudentTargetWithDetails } from '@/features/admission/types'

const statusLabels: Record<string, string> = {
  INTERESTED: '관심',
  TARGET: '목표',
  APPLIED: '지원 완료',
  ACCEPTED: '합격',
  REJECTED: '불합격',
  WITHDRAWN: '철회',
}

const statusColors: Record<string, string> = {
  INTERESTED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  TARGET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  APPLIED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WITHDRAWN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export function StudentTargetManager({
  targets,
  studentId,
  studentName,
}: {
  targets: StudentTargetWithDetails[]
  studentId: string
  studentName: string
}) {
  const t = useTranslations('Admission')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleStatusChange = async (targetId: string, status: string) => {
    const res = await updateTargetStatusAction(targetId, status)
    if (res.success) {
      toast.success('상태가 변경되었습니다.')
    } else {
      toast.error(res.error)
    }
  }

  const handleRemove = async (studentId: string, universityMajorId: string) => {
    setIsDeleting(universityMajorId)
    const res = await removeTargetAction(studentId, universityMajorId)
    setIsDeleting(null)
    if (res.success) {
      toast.success('목표 대학이 삭제되었습니다.')
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{studentName}</h3>
        <Badge variant="outline">{targets.length}개 목표</Badge>
      </div>

      {targets.length > 0 ? (
        <div className="space-y-4">
          {targets.map((target) => (
            <div key={target.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select
                    value={target.status}
                    onValueChange={(v) => handleStatusChange(target.id, v)}
                  >
                    <SelectTrigger className="h-7 w-auto">
                      <Badge className={`text-xs ${statusColors[target.status] ?? ''}`}>
                        {statusLabels[target.status] ?? target.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(target.studentId, target.universityMajorId)}
                  disabled={isDeleting === target.universityMajorId}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <AdmissionProbabilityCard target={target} studentId={studentId} />
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">{t('noTargets')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              대학 상세 페이지에서 목표를 추가하세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
