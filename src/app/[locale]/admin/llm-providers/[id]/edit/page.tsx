'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { ProviderForm } from '@/components/admin/llm-providers/provider-form';
import { getProviderTemplates } from '@/features/ai-engine/templates';
import type { ProviderTemplate } from '@/features/ai-engine/templates';
import type { ProviderWithModels } from '@/features/ai-engine';

interface EditProviderPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 제공자 편집 페이지
 * 
 * 기존 제공자의 설정을 수정합니다.
 */
export default function EditProviderPage({ params }: EditProviderPageProps) {
  const router = useRouter();
  const [providerId, setProviderId] = useState<string>('');
  const [provider, setProvider] = useState<ProviderWithModels | null>(null);
  const [template, setTemplate] = useState<ProviderTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // params에서 id 추출
  useEffect(() => {
    params.then(({ id }) => {
      setProviderId(id);
    });
  }, [params]);

  // 제공자 데이터 로드
  useEffect(() => {
    if (!providerId) return;

    async function loadProvider() {
      try {
        const response = await fetch(`/api/providers/${providerId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', response.status, errorData);
          throw new Error(errorData.error || '제공자를 불러오는데 실패했습니다.');
        }
        const data = await response.json();

        if (!data.provider) {
          throw new Error('제공자 데이터가 없습니다.');
        }

        setProvider(data.provider);

        // 템플릿 찾기
        const templates = getProviderTemplates();
        const matchedTemplate = templates.find(
          (t) => t.providerType === data.provider.providerType
        );
        setTemplate(matchedTemplate || null);
      } catch (error) {
        console.error('Load provider error:', error);
        toast.error(error instanceof Error ? error.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadProvider();
  }, [providerId, router]);

  // 저장 성공 핸들러
  const handleSuccess = () => {
    toast.success('제공자가 수정되었습니다.');
    router.push('/admin/llm-providers');
    router.refresh();
  };

  if (isLoading) {
    return (
      <AdminPageLayout
        title="제공자 수정"
        description="제공자 정보를 불러오는 중..."
        breadcrumbs={[
          { label: 'LLM Hub', href: '/admin/llm-providers' },
          { label: '제공자 수정' },
        ]}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  if (!provider) {
    return (
      <AdminPageLayout
        title="제공자 수정"
        description="제공자를 찾을 수 없습니다."
        breadcrumbs={[
          { label: 'LLM Hub', href: '/admin/llm-providers' },
          { label: '제공자 수정' },
        ]}
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              제공자를 찾을 수 없습니다. (ID: {providerId})
            </p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title={`${provider.name} 수정`}
      description="제공자 설정을 수정합니다."
      breadcrumbs={[
        { label: 'LLM Hub', href: '/admin/llm-providers' },
        { label: provider.name, href: `/admin/llm-providers` },
        { label: '수정' },
      ]}
    >
      <Card>
        <CardContent className="p-6">
          <ProviderForm
            template={template || undefined}
            provider={provider}
            onSuccess={handleSuccess}
            onProviderUpdate={setProvider}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
