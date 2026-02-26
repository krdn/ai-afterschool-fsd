import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function GradeReportsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            학부모 리포트 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Phase 4에서 구현 예정</p>
            <p className="text-sm mt-2">
              학부모에게 전달할 성적 리포트를 자동으로 생성하고 관리할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
