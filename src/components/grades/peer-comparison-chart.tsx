'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import type { PeerComparison } from '@/features/grade-management/types';

interface PeerComparisonChartProps {
  studentId: string;
  studentName: string;
  analyzeAction: (studentId: string) => Promise<{
    success: boolean;
    data?: PeerComparison;
    error?: string;
  }>;
}

const TREND_CONFIG = {
  UP: { icon: TrendingUp, label: '상승', color: 'text-green-600' },
  STABLE: { icon: Minus, label: '유지', color: 'text-muted-foreground' },
  DOWN: { icon: TrendingDown, label: '하락', color: 'text-red-600' },
};

export default function PeerComparisonChart({
  studentId,
  studentName,
  analyzeAction,
}: PeerComparisonChartProps) {
  const [result, setResult] = useState<PeerComparison | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await analyzeAction(studentId);
      if (response.success && response.data) {
        setResult(response.data);
        toast.success('동료 비교 분석이 완료되었습니다.');
      } else if (!response.success && response.error) {
        toast.error(response.error);
      }
    } catch {
      toast.error('동료 비교 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            동료 비교 분석 - {studentName}
          </CardTitle>
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                {result ? '다시 분석' : '분석 시작'}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          같은 학교, 같은 학년 학생들과의 상대적 위치를 파악합니다. (최소 5명 필요)
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">동료 비교 분석 중...</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* 전체 백분위 게이지 */}
            <div className="flex flex-col items-center">
              <h4 className="text-sm font-medium mb-2">전체 종합 백분위</h4>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  barSize={18}
                  data={[
                    {
                      name: '백분위',
                      value: result.overallPercentile,
                      fill: getPercentileColor(result.overallPercentile),
                    },
                  ]}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    background={{ fill: '#f3f4f6' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="-mt-20 text-center">
                <span className="text-3xl font-bold">
                  {result.overallPercentile}%
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  상위 {100 - result.overallPercentile}%
                </p>
              </div>
            </div>

            {/* 과목별 비교 바 차트 */}
            {result.subjects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">
                  과목별 학생 vs 반 평균
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={result.subjects.map((s) => ({
                      name: s.name,
                      '내 점수': s.studentScore,
                      '반 평균': s.classAverage,
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="내 점수"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="반 평균"
                      fill="#d1d5db"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 과목별 상세 */}
            {result.subjects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">과목별 상세</h4>
                <div className="space-y-2">
                  {result.subjects.map((s) => {
                    const trendCfg = TREND_CONFIG[s.trend];
                    const TrendIcon = trendCfg.icon;
                    const diff = s.studentScore - s.classAverage;

                    return (
                      <div
                        key={s.name}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {s.studentScore}점
                              </span>
                              <span className="text-xs text-muted-foreground">
                                (반평균 {s.classAverage})
                              </span>
                              <span
                                className={`text-xs font-medium ${
                                  diff >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {diff >= 0 ? '+' : ''}
                                {diff.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={
                              s.percentile >= 70
                                ? 'text-green-700 border-green-300'
                                : s.percentile >= 30
                                  ? 'text-foreground border'
                                  : 'text-red-700 border-red-300'
                            }
                          >
                            상위 {100 - s.percentile}%
                          </Badge>
                          <div className={`flex items-center gap-1 ${trendCfg.color}`}>
                            <TrendIcon className="w-4 h-4" />
                            <span className="text-xs">{trendCfg.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 분석 코멘트 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-900 whitespace-pre-wrap">
                  {result.comment}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mb-3" />
            <p className="text-sm text-center max-w-sm">
              동료 비교 분석을 실행하면 같은 학년, 같은 학교 학생들과의 상대적 위치를 확인할 수 있습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 백분위에 따른 색상 반환 */
function getPercentileColor(percentile: number): string {
  if (percentile >= 80) return '#10b981'; // 초록
  if (percentile >= 60) return '#3b82f6'; // 파랑
  if (percentile >= 40) return '#f59e0b'; // 주황
  return '#ef4444'; // 빨강
}
