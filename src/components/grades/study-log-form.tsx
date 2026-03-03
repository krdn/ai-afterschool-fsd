'use client';

import { useActionState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { addStudyLogAction } from '@/lib/actions/student/study-log';
import { useEffect } from 'react';

interface StudyLogFormProps {
  studentId: string;
  onSuccess?: () => void;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  HOMEWORK: '숙제',
  SELF_STUDY: '자기 학습',
  TUTORING: '과외/수업',
  REVIEW: '복습',
};

const COMMON_SUBJECTS = [
  '국어', '수학', '영어', '과학', '사회',
  '물리', '화학', '생물', '지구과학',
  '한국사', '세계사', '윤리',
];

export default function StudyLogForm({ studentId, onSuccess }: StudyLogFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(addStudyLogAction, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        formRef.current?.reset();
        onSuccess?.();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, onSuccess]);

  // 오늘 날짜를 기본값으로
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="w-4 h-4" />
          학습 기록 등록
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 날짜 */}
            <div className="space-y-2">
              <Label htmlFor="studyDate">학습 날짜</Label>
              <Input
                id="studyDate"
                name="studyDate"
                type="date"
                defaultValue={today}
                required
              />
            </div>

            {/* 과목 */}
            <div className="space-y-2">
              <Label htmlFor="subject">과목</Label>
              <Select name="subject">
                <SelectTrigger>
                  <SelectValue placeholder="과목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 학습 시간 */}
            <div className="space-y-2">
              <Label htmlFor="durationMin">학습 시간 (분)</Label>
              <Input
                id="durationMin"
                name="durationMin"
                type="number"
                min={1}
                max={720}
                placeholder="예: 60"
                required
              />
            </div>

            {/* 학습 유형 */}
            <div className="space-y-2">
              <Label htmlFor="taskType">학습 유형</Label>
              <Select name="taskType" defaultValue="SELF_STUDY">
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="학습 내용이나 특이사항을 입력하세요..."
              maxLength={500}
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                등록 중...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                학습 기록 등록
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
