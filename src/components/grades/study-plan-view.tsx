'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StudyPlanResult } from '@/features/grade-management/types';

interface StudyPlanViewProps {
  data: StudyPlanResult;
}

/** 요일별 색상 */
function getDayColor(day: string) {
  if (day.includes('토')) return 'text-blue-600';
  if (day.includes('일')) return 'text-red-600';
  return 'text-gray-900';
}

export default function StudyPlanView({ data }: StudyPlanViewProps) {
  // 요일별 총 학습시간 계산
  const totalHoursPerDay = data.weeklyPlan.map((dayPlan) => ({
    day: dayPlan.day,
    totalHours: dayPlan.subjects.reduce((sum, s) => sum + s.hours, 0),
  }));

  const weeklyTotalHours = totalHoursPerDay.reduce(
    (sum, d) => sum + d.totalHours,
    0
  );

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">학습 플랜 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 우선순위 과목 */}
          <div>
            <span className="text-sm font-medium text-gray-600">
              우선순위 과목:
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.prioritySubjects.map((subject) => (
                <Badge
                  key={subject}
                  className="bg-orange-100 text-orange-800 hover:bg-orange-100"
                >
                  {subject}
                </Badge>
              ))}
            </div>
          </div>

          {/* 주간 총 학습 시간 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              주간 총 학습 시간:
            </span>
            <span className="text-lg font-bold text-blue-600">
              {weeklyTotalHours.toFixed(1)}시간
            </span>
            <span className="text-sm text-gray-400">
              (일 평균 {(weeklyTotalHours / 7).toFixed(1)}시간)
            </span>
          </div>

          {/* 근거 */}
          <p className="text-sm text-gray-600">{data.rationale}</p>
        </CardContent>
      </Card>

      {/* 주간 시간표 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">주간 학습 시간표</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">요일</TableHead>
                  <TableHead className="min-w-[100px]">과목</TableHead>
                  <TableHead className="min-w-[60px] text-center">
                    시간
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    집중 포인트
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeklyPlan.map((dayPlan) =>
                  dayPlan.subjects.map((subject, idx) => (
                    <TableRow key={`${dayPlan.day}-${subject.name}`}>
                      {/* 요일 셀 - 첫 번째 과목일 때만 표시 (rowSpan) */}
                      {idx === 0 && (
                        <TableCell
                          rowSpan={dayPlan.subjects.length}
                          className={`font-semibold align-top border-r ${getDayColor(dayPlan.day)}`}
                        >
                          <div>
                            <div>{dayPlan.day}</div>
                            <div className="text-xs text-gray-400 font-normal mt-1">
                              총{' '}
                              {dayPlan.subjects
                                .reduce((sum, s) => sum + s.hours, 0)
                                .toFixed(1)}
                              h
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {data.prioritySubjects.includes(subject.name) && (
                            <span
                              className="inline-block w-2 h-2 rounded-full bg-orange-400"
                              title="우선순위 과목"
                            />
                          )}
                          <span className="font-medium">{subject.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {subject.hours}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {subject.focus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
