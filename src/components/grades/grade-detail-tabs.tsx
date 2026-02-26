'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LearningTab from '@/components/students/tabs/learning-tab';
import OcrUploadPage from '@/components/grades/ocr-upload-page';
import AiAnalysisPanel from '@/components/grades/ai-analysis-panel';
import CoachingReportPanel from '@/components/grades/coaching-report-panel';
import {
  BookOpen,
  ScanLine,
  Brain,
  CalendarCheck,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { checkStudentAlerts } from '@/lib/actions/student/grade-analysis';
import type { TeacherAlert } from '@/features/grade-management/types';

interface GradeDetailTabsProps {
  studentId: string;
  studentName: string;
  teacherId: string;
  initialTab?: string;
}

export default function GradeDetailTabs({
  studentId,
  studentName,
  teacherId,
  initialTab,
}: GradeDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = initialTab || searchParams.get('tab') || 'history';
  const [alerts, setAlerts] = useState<TeacherAlert[]>([]);

  // 교사 알림 자동 체크
  useEffect(() => {
    checkStudentAlerts(studentId).then((result) => {
      if (result.success && 'data' in result) {
        setAlerts(result.data);
      }
    });
  }, [studentId]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      {/* 교사 알림 배너 */}
      {alerts.length > 0 && <TeacherAlertBanner alerts={alerts} />}

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="history" className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">성적 이력</span>
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-1">
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">OCR 입력</span>
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center gap-1">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">AI 분석</span>
          </TabsTrigger>
          <TabsTrigger value="study-plan" className="flex items-center gap-1">
            <CalendarCheck className="w-4 h-4" />
            <span className="hidden sm:inline">코칭 리포트</span>
          </TabsTrigger>
          <TabsTrigger value="study-habit" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">학습 습관</span>
          </TabsTrigger>
          <TabsTrigger value="peer-compare" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">동료 비교</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <LearningTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="ocr" className="mt-6">
          <OcrUploadPage teacherId={teacherId} />
        </TabsContent>

        <TabsContent value="ai-analysis" className="mt-6">
          <AiAnalysisPanel studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="study-plan" className="mt-6">
          <CoachingReportPanel studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="study-habit" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">
                학습 습관 분석 - 추후 구현 예정
              </p>
              <p className="text-sm mt-2">
                {studentName} 학생의 학습 패턴과 습관을 추적하고 개선점을
                제안합니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peer-compare" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">
                동료 비교 분석 - 추후 구현 예정
              </p>
              <p className="text-sm mt-2">
                같은 학년, 같은 학교 학생들과의 상대적 위치를 파악합니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** 교사 알림 배너 컴포넌트 */
function TeacherAlertBanner({ alerts }: { alerts: TeacherAlert[] }) {
  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => {
        const config = getAlertConfig(alert);
        return (
          <div
            key={`${alert.alertType}-${index}`}
            className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
          >
            <config.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${config.badgeColor}`}>
                  {config.label}
                </Badge>
                <span className="text-xs text-gray-500">
                  심각도 {alert.severity}/5
                </span>
                <span className="text-xs text-gray-500">
                  {alert.subjects.join(', ')}
                </span>
              </div>
              <p className={`text-sm mt-1 ${config.textColor}`}>
                {alert.message}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {alert.suggestedAction}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 알림 유형별 스타일 설정 */
function getAlertConfig(alert: TeacherAlert) {
  switch (alert.alertType) {
    case 'AT_RISK':
      return {
        icon: AlertTriangle,
        label: '위험',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        textColor: 'text-red-800',
        badgeColor: 'border-red-300 text-red-700',
      };
    case 'SCORE_DROP':
      return {
        icon: TrendingDown,
        label: '급락',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600',
        textColor: 'text-orange-800',
        badgeColor: 'border-orange-300 text-orange-700',
      };
    case 'BELOW_AVERAGE':
      return {
        icon: Info,
        label: '평균 미달',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600',
        textColor: 'text-yellow-800',
        badgeColor: 'border-yellow-300 text-yellow-700',
      };
    case 'IMPROVEMENT':
      return {
        icon: TrendingUp,
        label: '개선',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        textColor: 'text-green-800',
        badgeColor: 'border-green-300 text-green-700',
      };
    default:
      return {
        icon: Info,
        label: '알림',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-600',
        textColor: 'text-gray-800',
        badgeColor: 'border-gray-300 text-gray-700',
      };
  }
}
