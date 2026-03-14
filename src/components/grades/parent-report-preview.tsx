'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Star,
  TrendingUp,
  Home,
  MessageCircle,
  BookOpen,
} from 'lucide-react';
import type { ParentReportData } from '@/features/grade-management/report/parent-report-generator';

interface ParentReportPreviewProps {
  report: ParentReportData;
}

export default function ParentReportPreview({
  report,
}: ParentReportPreviewProps) {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 리포트 헤더 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="text-center">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <CardTitle className="text-xl">학습 성적 리포트</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {report.studentName} ({report.schoolInfo})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              기간: {report.reportPeriod}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed text-center">
            {report.summary}
          </p>
        </CardContent>
      </Card>

      {/* 과목별 성적 */}
      {report.subjectComments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              과목별 평가
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.subjectComments.map((sc) => (
                <div
                  key={sc.subject}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{sc.subject}</span>
                    <Badge variant="outline">{sc.score}점</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{sc.comment}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 강점 */}
      {report.strengths.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <Star className="w-4 h-4" />
              잘하고 있는 점
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground p-2 bg-green-50 rounded"
                >
                  <Star className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 성장 포인트 */}
      {report.growthPoints.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <TrendingUp className="w-4 h-4" />
              앞으로의 성장 포인트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.growthPoints.map((g, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground p-2 bg-amber-50 rounded"
                >
                  <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 가정 학습 지도 방법 */}
      {report.homeStudyTips.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-purple-700">
              <Home className="w-4 h-4" />
              가정에서 이렇게 도와주세요
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.homeStudyTips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground p-2 bg-purple-50 rounded"
                >
                  <Home className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 선생님 한마디 */}
      {report.teacherNote && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <MessageCircle className="w-4 h-4" />
              선생님 한마디
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-900 italic leading-relaxed">
              &ldquo;{report.teacherNote}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* 생성 일시 */}
      <p className="text-xs text-muted-foreground text-center">
        생성일: {new Date(report.generatedAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
