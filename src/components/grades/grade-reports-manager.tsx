'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileText, Plus, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';
import { generateParentReportAction } from '@/lib/actions/student/parent-report';
import type { ParentReportData } from '@/features/grade-management/report/parent-report-generator';
import ParentReportPreview from './parent-report-preview';
import ParentReportSend from './parent-report-send';

type Student = {
  id: string;
  name: string;
  school: string;
  grade: number;
  _count: {
    parentGradeReports: number;
  };
};

type ReportItem = {
  id: string;
  studentId: string;
  reportPeriod: string;
  sentAt: Date | null;
  sentMethod: string | null;
  createdAt: Date;
  reportData: unknown;
  student: {
    name: string;
    school: string;
    grade: number;
  };
  parent: {
    name: string;
    relation: string;
  } | null;
};

interface GradeReportsManagerProps {
  students: Student[];
  recentReports: ReportItem[];
}

export default function GradeReportsManager({
  students,
  recentReports,
}: GradeReportsManagerProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<{
    reportId: string;
    data: ParentReportData;
  } | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null);

  // 리포트 생성
  const handleGenerate = async () => {
    if (!selectedStudentId) {
      toast.error('학생을 선택해주세요.');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateParentReportAction(selectedStudentId);
      if (result.success && 'data' in result) {
        setPreviewData({
          reportId: result.data.reportId,
          data: result.data.reportData,
        });
        toast.success('학부모 리포트가 생성되었습니다.');
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 기존 리포트 보기
  const handleViewReport = (report: ReportItem) => {
    setViewingReport(report);
    setPreviewData(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">학부모 리포트 관리</h1>
        <p className="text-muted-foreground">
          학생별 성적 리포트를 생성하고 학부모에게 발송합니다
        </p>
      </div>

      {/* 리포트 생성 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4" />
            새 리포트 생성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="학생 선택" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.school} {student.grade}학년)
                      {student._count.parentGradeReports > 0 && (
                        <span className="text-muted-foreground ml-2">
                          - 기존 {student._count.parentGradeReports}건
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedStudentId}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  리포트 생성
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 리포트 미리보기 */}
      {previewData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">리포트 미리보기</h2>
            <div className="flex gap-2">
              <ParentReportSend
                reportId={previewData.reportId}
                studentName={previewData.data.studentName}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewData(null)}
              >
                닫기
              </Button>
            </div>
          </div>
          <ParentReportPreview report={previewData.data} />
        </div>
      )}

      {/* 기존 리포트 보기 */}
      {viewingReport && !previewData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              리포트 상세 - {viewingReport.student.name}
            </h2>
            <div className="flex gap-2">
              <ParentReportSend
                reportId={viewingReport.id}
                studentName={viewingReport.student.name}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingReport(null)}
              >
                닫기
              </Button>
            </div>
          </div>
          <ParentReportPreview
            report={viewingReport.reportData as ParentReportData}
          />
        </div>
      )}

      {/* 최근 리포트 히스토리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            최근 리포트 ({recentReports.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생</TableHead>
                <TableHead>학교/학년</TableHead>
                <TableHead>기간</TableHead>
                <TableHead>발송 상태</TableHead>
                <TableHead className="text-center">생성일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    생성된 리포트가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.student.name}
                    </TableCell>
                    <TableCell>
                      {report.student.school} {report.student.grade}학년
                    </TableCell>
                    <TableCell className="text-sm">
                      {report.reportPeriod}
                    </TableCell>
                    <TableCell>
                      {report.sentAt ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          발송 완료 ({report.sentMethod})
                        </Badge>
                      ) : (
                        <Badge variant="secondary">미발송</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </Button>
                        {!report.sentAt && (
                          <ParentReportSend
                            reportId={report.id}
                            studentName={report.student.name}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
