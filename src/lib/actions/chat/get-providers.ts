'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';

export type ChatProvider = {
  id: string;
  name: string;
  providerType: string;
  models: Array<{
    id: string;
    modelId: string;
    displayName: string;
    isDefault: boolean;
  }>;
};

/**
 * 채팅에서 사용 가능한 활성 Provider/Model 목록을 반환합니다.
 * API 키 등 민감 정보는 제외합니다.
 */
export async function getEnabledProvidersForChat(): Promise<ChatProvider[]> {
  await verifySession();

  const providers = await db.provider.findMany({
    where: { isEnabled: true },
    include: {
      models: {
        select: {
          id: true,
          modelId: true,
          displayName: true,
          isDefault: true,
        },
        orderBy: { isDefault: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return providers
    .filter((p) => p.models.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      providerType: p.providerType,
      models: p.models,
    }));
}
