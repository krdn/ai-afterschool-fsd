'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { confirmOcrResult } from '@/lib/actions/student/grade-ocr';
import { CheckCircle, Loader2, FileSearch, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OcrSubject {
  subject: string;
  score: number;
  maxScore?: number;
  rank?: number;
  totalStudents?: number;
  confidence: number;
  [key: string]: unknown;
}

interface OcrResult {
  scanId: string;
  subjects: OcrSubject[];
  documentType: string;
  rawData?: unknown;
}

interface OcrReviewPanelProps {
  ocrResult: OcrResult | null;
  isProcessing: boolean;
}

// 신뢰도에 따른 Badge 색상
function getConfidenceBadge(confidence: number) {
  if (confidence >= 80) {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        {confidence}%
      </Badge>
    );
  }
  if (confidence >= 50) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        {confidence}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
      {confidence}%
    </Badge>
  );
}

export default function OcrReviewPanel({
  ocrResult,
  isProcessing,
}: OcrReviewPanelProps) {
  const [studentId, setStudentId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // 확정 및 저장
  const handleConfirm = async () => {
    if (!ocrResult) return;

    if (!studentId.trim()) {
      toast.error('학생 ID를 입력해주세요.');
      return;
    }

    setIsConfirming(true);
    try {
      const confirmedData = {
        documentInfo: { school: '', studentName: '', grade: 0, academicYear: new Date().getFullYear(), semester: 1 },
        subjects: ocrResult.subjects.map((s) => ({
          name: s.subject,
          rawScore: s.score,
          confidence: s.confidence,
          maxScore: s.maxScore,
          totalStudents: s.totalStudents,
        })),
      };
      const result = await confirmOcrResult(
        ocrResult.scanId,
        confirmedData,
        studentId.trim()
      );

      if (result.success) {
        toast.success('성적이 저장되었습니다.');
      } else {
        toast.error(result.message || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsConfirming(false);
    }
  };

  // 결과가 없을 때
  if (!ocrResult && !isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">분석 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileSearch className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">이미지를 업로드하세요</p>
            <p className="text-sm mt-2">
              성적표 이미지를 업로드하고 OCR 분석을 시작하면
              <br />
              추출된 성적이 여기에 표시됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 분석 중
  if (isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">분석 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-600" />
            <p className="text-lg font-medium text-muted-foreground">
              AI가 성적을 분석하고 있습니다...
            </p>
            <p className="text-sm mt-2">잠시만 기다려주세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 결과 표시
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          분석 결과
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 추출된 과목 테이블 */}
        {ocrResult && ocrResult.subjects.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>과목</TableHead>
                <TableHead className="text-center">원점수</TableHead>
                <TableHead className="text-center">만점</TableHead>
                <TableHead className="text-center">등급/석차</TableHead>
                <TableHead className="text-center">신뢰도</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ocrResult.subjects.map((subject, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {subject.subject}
                  </TableCell>
                  <TableCell className="text-center">{subject.score}</TableCell>
                  <TableCell className="text-center">
                    {subject.maxScore || 100}
                  </TableCell>
                  <TableCell className="text-center">
                    {subject.rank
                      ? `${subject.rank}${subject.totalStudents ? `/${subject.totalStudents}` : ''}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getConfidenceBadge(subject.confidence)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 text-yellow-600 py-4">
            <AlertCircle className="w-5 h-5" />
            <p>추출된 과목이 없습니다. 이미지를 확인해주세요.</p>
          </div>
        )}

        {/* 낮은 신뢰도 경고 */}
        {ocrResult &&
          ocrResult.subjects.some((s) => s.confidence < 50) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700">
                일부 과목의 인식 신뢰도가 낮습니다. 저장 전에 수동으로 확인해주세요.
              </p>
            </div>
          )}

        {/* 학생 ID 입력 */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="studentId">학생 ID</Label>
          <Input
            id="studentId"
            placeholder="성적을 저장할 학생 ID를 입력하세요"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            추후 학생 검색 기능으로 개선 예정
          </p>
        </div>

        {/* 확정 및 저장 버튼 */}
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleConfirm}
          disabled={
            isConfirming ||
            !ocrResult ||
            ocrResult.subjects.length === 0 ||
            !studentId.trim()
          }
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              확정 및 저장
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
