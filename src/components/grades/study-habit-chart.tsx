'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Clock,
  BarChart3,
  Activity,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  getStudyStatsAction,
  analyzeStudyHabitsAction,
} from '@/lib/actions/student/study-log';
import type { StudyStats } from '@/features/grade-management/study-habits/study-log-service';
import type { StudyHabitCorrelation } from '@/features/grade-management/types';
import StudyLogForm from './study-log-form';

interface StudyHabitChartProps {
  studentId: string;
  studentName: string;
}

const PIE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const TASK_TYPE_LABELS: Record<string, string> = {
  HOMEWORK: '숙제',
  SELF_STUDY: '자기 학습',
  TUTORING: '과외/수업',
  REVIEW: '복습',
};

export default function StudyHabitChart({
  studentId,
  studentName,
}: StudyHabitChartProps) {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [habitResult, setHabitResult] = useState<StudyHabitCorrelation | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [habitLoading, setHabitLoading] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  // 통계 조회
  const loadStats = useCallback(async (days?: number) => {
    setStatsLoading(true);
    try {
      const result = await getStudyStatsAction(studentId, days ?? periodDays);
      if (result.success && 'data' in result) {
        setStats(result.data);
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('통계 조회 중 오류가 발생했습니다.');
    } finally {
      setStatsLoading(false);
    }
  }, [studentId, periodDays]);

  // 습관 분석
  const loadHabitAnalysis = async () => {
    setHabitLoading(true);
    try {
      const result = await analyzeStudyHabitsAction(studentId);
      if (result.success && 'data' in result) {
        setHabitResult(result.data);
        toast.success('학습 습관 분석이 완료되었습니다.');
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('학습 습관 분석 중 오류가 발생했습니다.');
    } finally {
      setHabitLoading(false);
    }
  };

  // 기간 변경
  const handlePeriodChange = (days: number) => {
    setPeriodDays(days);
    loadStats(days);
  };

  // 폼 제출 성공 시 통계 새로고침
  const handleFormSuccess = useCallback(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      {/* 학습 기록 입력 폼 */}
      <StudyLogForm studentId={studentId} onSuccess={handleFormSuccess} />

      {/* 통계 조회 버튼 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              {studentName} 학습 통계
            </CardTitle>
            <div className="flex items-center gap-2">
              {[7, 14, 30, 60].map((days) => (
                <Button
                  key={days}
                  variant={periodDays === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(days)}
                  disabled={statsLoading}
                >
                  {days}일
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadStats()}
                disabled={statsLoading}
              >
                <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">통계를 불러오는 중...</p>
            </div>
          ) : !stats ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BarChart3 className="w-8 h-8 mb-3" />
              <p className="text-sm">기간을 선택하면 학습 통계를 확인할 수 있습니다.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => loadStats()}
              >
                통계 조회
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 요약 카드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  icon={<Clock className="w-4 h-4 text-blue-600" />}
                  label="총 학습 시간"
                  value={`${Math.floor(stats.totalMinutes / 60)}시간 ${stats.totalMinutes % 60}분`}
                />
                <SummaryCard
                  icon={<TrendingUp className="w-4 h-4 text-green-600" />}
                  label="일 평균"
                  value={`${stats.dailyAverageMinutes}분`}
                />
                <SummaryCard
                  icon={<Activity className="w-4 h-4 text-purple-600" />}
                  label="규칙성"
                  value={`${stats.consistencyScore}%`}
                />
                <SummaryCard
                  icon={<BarChart3 className="w-4 h-4 text-orange-600" />}
                  label="학습 과목"
                  value={`${stats.subjectDistribution.length}개`}
                />
              </div>

              {/* 일별 학습 시간 라인 차트 */}
              {stats.dailyStudyTime.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">일별 학습 시간</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={stats.dailyStudyTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(d: string) => d.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} unit="분" />
                      <Tooltip
                        formatter={(value: number) => [`${value}분`, '학습 시간']}
                        labelFormatter={(label: string) => `날짜: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalMinutes"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="학습 시간"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 과목별 파이 차트 */}
              {stats.subjectDistribution.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">과목별 학습 시간</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={stats.subjectDistribution}
                          dataKey="totalMinutes"
                          nameKey="subject"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ subject, percentage }: { subject: string; percentage: number }) =>
                            `${subject} ${percentage}%`
                          }
                        >
                          {stats.subjectDistribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value}분`, '학습 시간']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 학습 유형별 분포 */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">학습 유형 분포</h4>
                    <div className="space-y-3">
                      {stats.taskTypeDistribution.map((item) => {
                        const percentage = stats.totalMinutes > 0
                          ? Math.round((item.totalMinutes / stats.totalMinutes) * 100)
                          : 0;
                        return (
                          <div key={item.taskType} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{TASK_TYPE_LABELS[item.taskType] || item.taskType}</span>
                              <span className="text-gray-500">
                                {item.count}회 / {item.totalMinutes}분
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {stats.totalMinutes === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">
                    최근 {periodDays}일간 학습 기록이 없습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 학습 습관 분석 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4" />
              AI 학습 습관 분석
            </CardTitle>
            <Button
              size="sm"
              onClick={loadHabitAnalysis}
              disabled={habitLoading}
            >
              {habitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  {habitResult ? '다시 분석' : '분석 시작'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {habitLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">AI가 학습 습관을 분석하고 있습니다...</p>
            </div>
          ) : habitResult ? (
            <div className="space-y-4">
              {/* 상관관계 */}
              {habitResult.correlations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">학습 습관 분석</h4>
                  {habitResult.correlations.map((c, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        c.impact === 'POSITIVE'
                          ? 'bg-green-50 border-green-200'
                          : c.impact === 'NEGATIVE'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{c.habit}</span>
                        <Badge
                          variant="outline"
                          className={
                            c.impact === 'POSITIVE'
                              ? 'text-green-700 border-green-300'
                              : c.impact === 'NEGATIVE'
                                ? 'text-red-700 border-red-300'
                                : 'text-gray-700 border-gray-300'
                          }
                        >
                          {c.impact === 'POSITIVE'
                            ? '긍정적'
                            : c.impact === 'NEGATIVE'
                              ? '개선 필요'
                              : '보통'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{c.description}</p>
                      {c.affectedSubjects.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {c.affectedSubjects.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 추천사항 */}
              {habitResult.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">개선 추천</h4>
                  <ul className="space-y-1">
                    {habitResult.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700 p-2 bg-blue-50 rounded"
                      >
                        <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Activity className="w-8 h-8 mb-3" />
              <p className="text-sm text-center max-w-sm">
                학습 습관 분석을 실행하면 학습 패턴과 성적 간의 상관관계를 확인할 수 있습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** 요약 카드 컴포넌트 */
function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
