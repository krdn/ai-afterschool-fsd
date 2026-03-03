import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function GradeAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            성적 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BarChart3 className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Phase 2에서 구현 예정</p>
            <p className="text-sm mt-2">
              학생별, 과목별, 시기별 성적 통계와 트렌드 분석을 확인할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
