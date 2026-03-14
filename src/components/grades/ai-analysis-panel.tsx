'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Target, CalendarDays, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  analyzeStudentStrengthWeakness,
  analyzeStudentGoalGap,
  generateStudentStudyPlan,
} from '@/lib/actions/student/grade-analysis';
import type {
  StrengthWeaknessResult,
  GoalGapResult,
  StudyPlanResult,
} from '@/features/grade-management/types';
import GoalGapDashboard from './goal-gap-dashboard';
import StudyPlanView from './study-plan-view';

interface AiAnalysisPanelProps {
  studentId: string;
  studentName: string;
}

type AnalysisTab = 'strength-weakness' | 'goal-gap' | 'study-plan';

export default function AiAnalysisPanel({
  studentId,
  studentName,
}: AiAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('strength-weakness');

  // 각 분석 결과 상태
  const [swResult, setSwResult] = useState<StrengthWeaknessResult | null>(null);
  const [ggResult, setGgResult] = useState<GoalGapResult | null>(null);
  const [spResult, setSpResult] = useState<StudyPlanResult | null>(null);

  // 로딩 상태
  const [swLoading, setSwLoading] = useState(false);
  const [ggLoading, setGgLoading] = useState(false);
  const [spLoading, setSpLoading] = useState(false);

  // 강점/약점 분석 실행
  const handleAnalyzeStrengthWeakness = async () => {
    setSwLoading(true);
    try {
      const result = await analyzeStudentStrengthWeakness(studentId);
      if (result.success && 'data' in result) {
        setSwResult(result.data);
        toast.success('강점/약점 분석이 완료되었습니다.');
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setSwLoading(false);
    }
  };

  // 목표 격차 분석 실행
  const handleAnalyzeGoalGap = async () => {
    setGgLoading(true);
    try {
      const result = await analyzeStudentGoalGap(studentId);
      if (result.success && 'data' in result) {
        setGgResult(result.data);
        toast.success('목표 격차 분석이 완료되었습니다.');
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setGgLoading(false);
    }
  };

  // 학습 플랜 생성 실행
  const handleGenerateStudyPlan = async () => {
    setSpLoading(true);
    try {
      const result = await generateStudentStudyPlan(studentId);
      if (result.success && 'data' in result) {
        setSpResult(result.data);
        toast.success('학습 플랜이 생성되었습니다.');
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('학습 플랜 생성 중 오류가 발생했습니다.');
    } finally {
      setSpLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI 학습 분석 - {studentName}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            24시간 캐싱
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="strength-weakness" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">강점/약점</span>
              <span className="sm:hidden">강약점</span>
            </TabsTrigger>
            <TabsTrigger value="goal-gap" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">목표 격차</span>
              <span className="sm:hidden">격차</span>
            </TabsTrigger>
            <TabsTrigger value="study-plan" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">학습 플랜</span>
              <span className="sm:hidden">플랜</span>
            </TabsTrigger>
          </TabsList>

          {/* 강점/약점 탭 */}
          <TabsContent value="strength-weakness">
            <div className="space-y-4 pt-4">
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyzeStrengthWeakness}
                  disabled={swLoading}
                  size="sm"
                >
                  {swLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {swResult ? '다시 분석' : '분석 시작'}
                    </>
                  )}
                </Button>
              </div>

              {swResult ? (
                <StrengthWeaknessView data={swResult} />
              ) : (
                <EmptyState
                  message="강점/약점 분석을 실행하면 과목별 분석 결과를 확인할 수 있습니다."
                  loading={swLoading}
                />
              )}
            </div>
          </TabsContent>

          {/* 목표 격차 탭 */}
          <TabsContent value="goal-gap">
            <div className="space-y-4 pt-4">
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyzeGoalGap}
                  disabled={ggLoading}
                  size="sm"
                >
                  {ggLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      {ggResult ? '다시 분석' : '분석 시작'}
                    </>
                  )}
                </Button>
              </div>

              {ggResult ? (
                <GoalGapDashboard data={ggResult} />
              ) : (
                <EmptyState
                  message="목표 격차 분석을 실행하면 현재 점수와 목표 점수의 차이를 확인할 수 있습니다."
                  loading={ggLoading}
                />
              )}
            </div>
          </TabsContent>

          {/* 학습 플랜 탭 */}
          <TabsContent value="study-plan">
            <div className="space-y-4 pt-4">
              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateStudyPlan}
                  disabled={spLoading}
                  size="sm"
                >
                  {spLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {spResult ? '다시 생성' : '플랜 생성'}
                    </>
                  )}
                </Button>
              </div>

              {spResult ? (
                <StudyPlanView data={spResult} />
              ) : (
                <EmptyState
                  message="학습 플랜을 생성하면 맞춤형 주간 학습 시간표를 확인할 수 있습니다."
                  loading={spLoading}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/** 강점/약점 분석 결과 표시 컴포넌트 */
function StrengthWeaknessView({ data }: { data: StrengthWeaknessResult }) {
  return (
    <div className="space-y-4">
      {/* 강점 */}
      {data.strengths.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700 dark:text-green-400">
              강점 과목
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.strengths.map((s) => (
                <div
                  key={s.subject}
                  className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/30"
                >
                  <div>
                    <span className="font-medium">{s.subject}</span>
                    <p className="text-sm text-muted-foreground">{s.reason}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:text-green-300 hover:bg-green-100">
                    {s.score}점
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 약점 */}
      {data.weaknesses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700 dark:text-red-400">
              약점 과목 및 개선 방안
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.weaknesses.map((w) => (
                <div
                  key={w.subject}
                  className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.subject}</span>
                    <Badge className="bg-red-100 text-red-800 dark:text-red-300 hover:bg-red-100">
                      {w.score}점
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{w.reason}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Tip: {w.improvementTip}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 종합 분석 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">종합 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {data.summary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** 빈 상태 표시 컴포넌트 */
function EmptyState({
  message,
  loading,
}: {
  message: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {loading ? (
        <>
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">AI가 분석하고 있습니다...</p>
        </>
      ) : (
        <>
          <Sparkles className="w-8 h-8 mb-3" />
          <p className="text-sm text-center max-w-sm">{message}</p>
        </>
      )}
    </div>
  );
}
