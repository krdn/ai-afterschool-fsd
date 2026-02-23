'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteTeacher, getTeacherStudentCount } from '@/lib/actions/teacher/crud'

type TeacherDeleteDialogProps = {
  teacherId: string
  teacherName: string
  variant?: 'icon' | 'button'
}

export function TeacherDeleteDialog({
  teacherId,
  teacherName,
  variant = 'button',
}: TeacherDeleteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 다이얼로그 열릴 때 담당 학생 수 조회
  useEffect(() => {
    if (open) {
      getTeacherStudentCount(teacherId).then(setStudentCount)
    }
  }, [open, teacherId])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTeacher(teacherId)
      if (result.success) {
        setOpen(false)
        toast.success(`${teacherName} 선생님이 삭제되었어요`)
        router.push('/teachers')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('선생님 삭제 중 오류가 발생했어요')
    } finally {
      setIsDeleting(false)
    }
  }

  const hasStudents = studentCount !== null && studentCount > 0

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>선생님 삭제</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                <strong>{teacherName}</strong> 선생님을 삭제하시겠어요?
              </p>
              <p>이 작업은 되돌릴 수 없으며, 관련 분석 데이터도 함께 삭제됩니다.</p>
              {hasStudents && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    담당 학생이 <strong>{studentCount}명</strong> 있어요.
                    먼저 다른 선생님에게 재배정해주세요.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          {!hasStudents && (
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
