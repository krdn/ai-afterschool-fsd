import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { getProvidersAction } from '@/lib/actions/admin/providers';
import { ProviderListClient } from './provider-list-client';
import { HelpIntegration, QuickHelpSection } from './help-integration';

export const metadata: Metadata = {
  title: 'LLM 제공자 관리 | AI AfterSchool Admin',
  description: 'LLM 제공자를 관리하고 설정합니다.',
};

/**
 * LLM 제공자 관리 페이지 (Server Component)
 *
 * 제공자 목록을 서버에서 가져와서 클라이언트 컴포넌트에 전달합니다.
 */
export default async function LLMProvidersPage() {
  const providers = await getProvidersAction();

  return (
    <AdminPageLayout
      title="LLM 제공자 관리"
      description="AI 기능에 사용될 LLM 제공자를 등록하고 관리합니다"
      breadcrumbs={[
        { label: 'LLM Hub', href: '/admin' },
        { label: '제공자 관리' },
      ]}
      actions={
        <>
          <Button asChild>
            <Link href="/admin/llm-providers/new">
              <Plus className="w-4 h-4 mr-2" />
              새 제공자 추가
            </Link>
          </Button>
        </>
      }
    >
      {/* 도움말 시스템 통합 */}
      <HelpIntegration />

      {/* 제공자 목록 */}
      <ProviderListClient providers={providers} />

      {/* 퀵 헬프 섹션 */}
      <QuickHelpSection />
    </AdminPageLayout>
  );
}
