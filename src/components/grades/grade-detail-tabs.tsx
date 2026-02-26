'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import LearningTab from '@/components/students/tabs/learning-tab';
import {
  BookOpen,
  ScanLine,
  Brain,
  CalendarCheck,
  Clock,
  Users,
} from 'lucide-react';

interface GradeDetailTabsProps {
  studentId: string;
  studentName: string;
  initialTab?: string;
}

export default function GradeDetailTabs({
  studentId,
  studentName,
  initialTab,
}: GradeDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = initialTab || searchParams.get('tab') || 'history';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
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
          <span className="hidden sm:inline">학습 플랜</span>
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ScanLine className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">
              OCR 성적 입력 - Phase 2에서 구현 예정
            </p>
            <p className="text-sm mt-2">
              {studentName} 학생의 성적표를 촬영하여 자동으로 성적을 입력할 수
              있습니다.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai-analysis" className="mt-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Brain className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">
              AI 성적 분석 - Phase 2에서 구현 예정
            </p>
            <p className="text-sm mt-2">
              AI가 {studentName} 학생의 성적 패턴을 분석하고 맞춤 학습 전략을
              제안합니다.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="study-plan" className="mt-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CalendarCheck className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">
              학습 플랜 - Phase 3에서 구현 예정
            </p>
            <p className="text-sm mt-2">
              {studentName} 학생의 목표에 맞는 개인화된 학습 계획을 수립합니다.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="study-habit" className="mt-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Clock className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">
              학습 습관 분석 - Phase 3에서 구현 예정
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
              동료 비교 분석 - Phase 3에서 구현 예정
            </p>
            <p className="text-sm mt-2">
              같은 학년, 같은 학교 학생들과의 상대적 위치를 파악합니다.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
