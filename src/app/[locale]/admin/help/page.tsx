import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpCenter } from '@/components/help/help-center';
import { verifySession } from '@/lib/dal';

export const metadata: Metadata = {
  title: '도움말 센터 | LLM Hub',
  description: 'LLM Hub 사용 가이드 및 문제 해결',
};

/**
 * 도움말 센터 페이지
 *
 * 주제별 가이드, 검색, 상세 내용을 제공합니다.
 */
export default async function HelpPage() {
  // DIRECTOR 권한 확인
  const session = await verifySession();
  if (!session || session.role !== 'DIRECTOR') {
    redirect('/admin');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            도움말 센터
          </h1>
          <p className="text-muted-foreground">
            LLM Hub 사용 가이드 및 문제 해결
          </p>
        </div>
      </div>

      {/* 도움말 센터 컴포넌트 */}
      <HelpCenter variant="page" />
    </div>
  );
}
