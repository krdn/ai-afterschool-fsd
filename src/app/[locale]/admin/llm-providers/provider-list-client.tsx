'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProviderList } from '@/components/admin/llm-providers/provider-list';
import {
  validateProviderAction,
  updateProviderAction,
  deleteProviderAction,
} from '@/lib/actions/admin/providers';
import type { ProviderWithModels } from '@/features/ai-engine';
import { handleStaleDeploymentError } from '@/lib/errors/stale-deployment';

interface ProviderListClientProps {
  providers: ProviderWithModels[];
}

/**
 * 제공자 목록 클라이언트 컴포넌트
 * 
 * 서버에서 받은 제공자 목록을 관리하고 클라이언트 상호작용을 처리합니다.
 */
export function ProviderListClient({ providers }: ProviderListClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 편집 핸들러
  const handleEdit = useCallback((provider: ProviderWithModels) => {
    const { id } = provider;
    router.push(`/admin/llm-providers/${id}/edit`);
  }, [router]);

  // 삭제 핸들러
  const handleDelete = useCallback(async (provider: ProviderWithModels) => {
    const { id } = provider;
    setIsLoading(true);
    try {
      await deleteProviderAction(id);
      toast.success('제공자가 삭제되었습니다.');
      router.refresh();
    } catch (error) {
      if (handleStaleDeploymentError(error)) return;
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // 테스트 핸들러
  const handleTest = useCallback(async (provider: ProviderWithModels) => {
    const { id } = provider;
    try {
      const result = await validateProviderAction(id);
      return {
        success: result.isValid,
        message: result.isValid ? '연결 성공!' : result.error || '연결 실패',
      };
    } catch (error) {
      if (handleStaleDeploymentError(error)) {
        return { success: false, message: '새 버전이 배포되었습니다. 페이지를 새로고침합니다.' };
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : '테스트 중 오류가 발생했습니다.',
      };
    }
  }, []);

  // 토글 핸들러
  const handleToggle = useCallback(async (provider: ProviderWithModels, enabled: boolean) => {
    const { id } = provider;
    setIsLoading(true);
    try {
      await updateProviderAction(id, { isEnabled: enabled });
      toast.success(enabled ? '제공자가 활성화되었습니다.' : '제공자가 비활성화되었습니다.');
      router.refresh();
    } catch (error) {
      if (handleStaleDeploymentError(error)) return;
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <ProviderList
      providers={providers}
      isLoading={isLoading}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onTest={handleTest}
      onToggle={handleToggle}
    />
  );
}
