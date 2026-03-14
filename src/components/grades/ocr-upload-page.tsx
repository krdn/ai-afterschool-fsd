'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { uploadAndProcessGradeImage } from '@/lib/actions/student/grade-ocr';
import OcrReviewPanel from '@/components/grades/ocr-review-panel';
import { ScanLine, Upload, Camera, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface OcrUploadPageProps {
  teacherId: string;
}

// OCR 분석 결과 타입
interface OcrResult {
  scanId: string;
  subjects: Array<{
    subject: string;
    score: number;
    maxScore?: number;
    rank?: number;
    totalStudents?: number;
    confidence: number;
    [key: string]: unknown;
  }>;
  documentType: string;
  rawData?: unknown;
}

export default function OcrUploadPage({ teacherId }: OcrUploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('TRANSCRIPT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 10MB 제한
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setSelectedFile(file);
    setOcrResult(null);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // OCR 분석 시작
  const handleStartOcr = async () => {
    if (!selectedFile) {
      toast.error('이미지 파일을 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('documentType', documentType);
      formData.append('teacherId', teacherId);

      const result = await uploadAndProcessGradeImage(formData);

      if (result.success && result.extractedData) {
        setOcrResult({
          scanId: result.scanId!,
          subjects: (result.extractedData as { subjects?: Array<Record<string, unknown>> })?.subjects?.map((s) => ({
            subject: String(s.name ?? s.subject ?? ''),
            score: Number(s.rawScore ?? s.score ?? 0),
            maxScore: s.maxScore != null ? Number(s.maxScore) : undefined,
            confidence: Number(s.confidence ?? 0),
          })) ?? [],
          documentType,
          rawData: result.extractedData,
        });
        toast.success('OCR 분석이 완료되었습니다.');
      } else {
        toast.error(result.message || 'OCR 분석에 실패했습니다.');
      }
    } catch {
      toast.error('OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 파일 초기화
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScanLine className="w-8 h-8 text-blue-600" />
          OCR 성적 입력
        </h1>
        <p className="text-muted-foreground mt-1">
          성적표 사진을 업로드하면 AI가 자동으로 과목별 성적을 추출합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 이미지 업로드 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">이미지 업로드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 파일 업로드 영역 */}
              <div
                className="border-2 border-dashed border rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="업로드된 이미지 미리보기"
                      className="max-h-64 mx-auto rounded-lg shadow-sm"
                    />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile?.name} (
                      {((selectedFile?.size || 0) / 1024).toFixed(1)}KB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground font-medium">
                        클릭하여 이미지를 선택하세요
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PNG, JPG, JPEG (최대 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* 파일 선택 버튼들 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  파일 선택
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute(
                        'capture',
                        'environment'
                      );
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  카메라 촬영
                </Button>
              </div>

              {/* 문서 유형 선택 */}
              <div className="space-y-2">
                <Label htmlFor="documentType">문서 유형</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="문서 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSCRIPT">
                      내신 성적표 (TRANSCRIPT)
                    </SelectItem>
                    <SelectItem value="MOCK_EXAM">
                      모의고사 성적표 (MOCK_EXAM)
                    </SelectItem>
                    <SelectItem value="CUSTOM">
                      기타 문서 (CUSTOM)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleStartOcr}
                  disabled={!selectedFile || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4 mr-2" />
                      OCR 분석 시작
                    </>
                  )}
                </Button>
                {selectedFile && (
                  <Button variant="outline" onClick={handleReset}>
                    초기화
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: OCR 결과 패널 */}
        <OcrReviewPanel ocrResult={ocrResult} isProcessing={isProcessing} />
      </div>
    </div>
  );
}
