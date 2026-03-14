'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Sparkles,
  Heart,
  BookOpen,
  Target,
  CalendarDays,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateStudentCoachingReport } from '@/lib/actions/student/grade-analysis';
import type { CoachingReport } from '@/features/grade-management/analysis/coaching-report';
import GoalGapDashboard from './goal-gap-dashboard';
import StudyPlanView from './study-plan-view';

interface CoachingReportPanelProps {
  studentId: string;
  studentName: string;
}

export default function CoachingReportPanel({
  studentId,
  studentName,
}: CoachingReportPanelProps) {
  const [report, setReport] = useState<CoachingReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateStudentCoachingReport(studentId);
      if (result.success && 'data' in result) {
        setReport(result.data);
        toast.success('종합 코칭 리포트가 생성되었습니다.');
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('코칭 리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            종합 코칭 리포트 - {studentName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              24시간 캐싱
            </Badge>
            <Button onClick={handleGenerate} disabled={loading} size="sm">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {report ? '다시 생성' : '리포트 생성'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {report ? (
          <CoachingReportView report={report} />
        ) : (
          <EmptyState loading={loading} />
        )}
      </CardContent>
    </Card>
  );
}

/** 코칭 리포트 전체 뷰 */
function CoachingReportView({ report }: { report: CoachingReport }) {
  return (
    <div className="space-y-6">
      {/* 동기부여 메시지 카드 */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">
                동기부여 메시지
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-400 whitespace-pre-wrap">
                {report.motivationMessage}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 종합 추천 카드 */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">
                종합 학습 전략
              </h3>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">
                {report.overallRecommendation}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 강점/약점 요약 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-600" />
            강점/약점 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 강점 */}
            {report.strengthWeakness.strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-700">강점 과목</h4>
                {report.strengthWeakness.strengths.map((s) => (
                  <div
                    key={s.subject}
                    className="flex items-center justify-between p-2 rounded bg-green-50"
                  >
                    <span className="text-sm font-medium">{s.subject}</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {s.score}점
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {/* 약점 */}
            {report.strengthWeakness.weaknesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-700">약점 과목</h4>
                {report.strengthWeakness.weaknesses.map((w) => (
                  <div
                    key={w.subject}
                    className="p-2 rounded bg-red-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{w.subject}</span>
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        {w.score}점
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Tip: {w.improvementTip}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
            {report.strengthWeakness.summary}
          </p>
        </CardContent>
      </Card>

      {/* 목표 격차 대시보드 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-purple-600" />
          <h3 className="text-base font-semibold">목표 격차 분석</h3>
        </div>
        <GoalGapDashboard data={report.goalGap} />
      </div>

      {/* 학습 플랜 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-semibold">맞춤 학습 플랜</h3>
        </div>
        <StudyPlanView data={report.studyPlan} />
      </div>

      {/* 생성 시간 */}
      <p className="text-xs text-muted-foreground text-right">
        리포트 생성: {new Date(report.generatedAt).toLocaleString('ko-KR')}
      </p>
    </div>
  );
}

/** 빈 상태 표시 */
function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      {loading ? (
        <>
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="text-sm font-medium">AI가 종합 코칭 리포트를 생성하고 있습니다...</p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>성적 데이터 분석 중</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground/50">강점/약점 계산</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground/50">맞춤 학습 플랜 작성</span>
            </div>
          </div>
          <p className="text-xs mt-3 text-muted-foreground/70">
            약 1~2분 소요됩니다
          </p>
        </>
      ) : (
        <>
          <Sparkles className="w-10 h-10 mb-4" />
          <p className="text-sm text-center max-w-md">
            종합 코칭 리포트를 생성하면 강점/약점 분석, 목표 격차, 맞춤 학습 플랜,
            동기부여 메시지를 한 번에 확인할 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
