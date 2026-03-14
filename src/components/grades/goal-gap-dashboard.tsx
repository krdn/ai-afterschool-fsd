'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { GoalGapResult } from '@/features/grade-management/types';

interface GoalGapDashboardProps {
  data: GoalGapResult;
}

/** achievability 배지 색상 매핑 */
function getAchievabilityBadge(achievability: 'HIGH' | 'MEDIUM' | 'LOW') {
  switch (achievability) {
    case 'HIGH':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          달성 가능성 높음
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          달성 가능성 보통
        </Badge>
      );
    case 'LOW':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          달성 가능성 낮음
        </Badge>
      );
  }
}

/** 격차에 따른 바 색상 */
function getGapColor(gap: number) {
  if (gap <= 10) return '#22c55e'; // green
  if (gap <= 20) return '#eab308'; // yellow
  return '#ef4444'; // red
}

export default function GoalGapDashboard({ data }: GoalGapDashboardProps) {
  // 차트 데이터: 현재 점수와 목표 점수를 나란히 비교
  const chartData = data.gaps.map((g) => ({
    subject: g.subject,
    현재점수: g.currentScore,
    목표점수: g.targetScore,
    격차: g.gap,
  }));

  return (
    <div className="space-y-6">
      {/* 전체 달성 가능성 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">전체 달성 가능성</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative h-4 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.overallAchievability}%`,
                    backgroundColor:
                      data.overallAchievability >= 70
                        ? '#22c55e'
                        : data.overallAchievability >= 40
                          ? '#eab308'
                          : '#ef4444',
                  }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold min-w-[60px] text-right">
              {data.overallAchievability}%
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{data.advice}</p>
        </CardContent>
      </Card>

      {/* 과목별 현재/목표 점수 비교 차트 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">과목별 현재 vs 목표 점수</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value}점`]}
                />
                <Bar dataKey="현재점수" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                <Bar dataKey="목표점수" fill="#a78bfa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 과목별 상세 격차 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.gaps.map((gap) => (
          <Card key={gap.subject}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-base">{gap.subject}</span>
                {getAchievabilityBadge(gap.achievability)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span>
                  현재:{' '}
                  <span className="font-medium text-blue-600">
                    {gap.currentScore}점
                  </span>
                </span>
                <span>→</span>
                <span>
                  목표:{' '}
                  <span className="font-medium text-purple-600">
                    {gap.targetScore}점
                  </span>
                </span>
                <span
                  className="font-bold"
                  style={{ color: getGapColor(gap.gap) }}
                >
                  (격차 {gap.gap}점)
                </span>
              </div>
              {/* 격차 시각 바 */}
              <div className="relative h-2 w-full rounded-full bg-muted mb-2">
                <div
                  className="absolute h-full rounded-full bg-blue-400"
                  style={{ width: `${gap.currentScore}%` }}
                />
                <div
                  className="absolute h-full w-0.5 bg-purple-600"
                  style={{ left: `${gap.targetScore}%` }}
                  title={`목표: ${gap.targetScore}점`}
                />
              </div>
              <p className="text-sm text-muted-foreground">{gap.strategy}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
