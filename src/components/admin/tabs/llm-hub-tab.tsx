'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Info, AlertCircle, BarChart3 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProviderList } from '@/components/admin/llm-providers/provider-list';
import { FeatureMappingList } from '@/components/admin/llm-features/feature-mapping-list';
import type { ProviderWithModels } from '@/features/ai-engine';
import type { MatchMode, FallbackMode } from '@/features/ai-engine';
import type { DailyUsageData, ProviderUsageData, FeatureUsageData } from '@/types/llm-usage';

interface FeatureMapping {
  id: string;
  featureType: string;
  matchMode: MatchMode;
  requiredTags: string[];
  excludedTags: string[];
  specificModelId: string | null;
  priority: number;
  fallbackMode: FallbackMode;
  specificModel: null;
}

interface BudgetSummary {
  period: string;
  budget: number;
  currentCost: number;
  percentUsed: number;
  remaining: number;
  isOverBudget: boolean;
}

interface LLMHubTabProps {
  providers: ProviderWithModels[];
  mappings: FeatureMapping[];
  // 사용량 데이터
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  dailyUsageData: DailyUsageData[];
  providerUsageData: ProviderUsageData[];
  featureUsageData: FeatureUsageData[];
  usageSummary: BudgetSummary[];
}

/**
 * LLM Hub 통합 탭
 *
 * 제공자 관리, 기능별 매핑, 사용량 모니터링을 서브탭으로 통합합니다.
 */
export function LLMHubTab({
  providers,
  mappings,
  dailyCost,
  weeklyCost,
  monthlyCost,
  dailyUsageData,
  providerUsageData,
  featureUsageData,
  usageSummary,
}: LLMHubTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('providers');
  const [isLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderWithModels | null>(null);

  const activeProviders = providers.filter((p) => p.isEnabled);

  // 제공자 액션 핸들러
  const handleEdit = (provider: ProviderWithModels) => {
    window.location.href = `/admin/llm-providers/${provider.id}/edit`;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    window.location.href = `/admin/llm-providers/${deleteTarget.id}/delete`;
  };

  const handleTest = async (): Promise<{ success: boolean; message: string }> => {
    return { success: true, message: '테스트 페이지로 이동합니다.' };
  };

  const handleToggle = async () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">활성 제공자</p>
                <p className="text-2xl font-bold">{activeProviders.length}<span className="text-sm font-normal text-muted-foreground">/{providers.length}</span></p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/llm-providers/new">
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">기능 매핑 규칙</p>
              <p className="text-2xl font-bold">{mappings.length}<span className="text-sm font-normal text-muted-foreground">개</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">이번 달 비용</p>
                <p className="text-2xl font-bold">${monthlyCost.toFixed(4)}</p>
              </div>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 서브탭 */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="providers">
            제공자 관리 ({providers.length})
          </TabsTrigger>
          <TabsTrigger value="mappings">
            기능 매핑 ({mappings.length})
          </TabsTrigger>
          <TabsTrigger value="usage">
            사용량
          </TabsTrigger>
        </TabsList>

        {/* 제공자 관리 서브탭 */}
        <TabsContent value="providers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">등록된 제공자</h3>
              <p className="text-sm text-muted-foreground">
                활성: {activeProviders.length}개 / 전체: {providers.length}개
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/llm-providers/new">
                <Plus className="w-4 h-4 mr-2" />
                새 제공자 추가
              </Link>
            </Button>
          </div>

          {activeProviders.length === 0 && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                  <span>
                    활성화된 LLM 제공자가 없습니다.
                    <Link href="/admin/llm-providers/new" className="underline font-medium ml-1">
                      제공자를 먼저 등록해주세요.
                    </Link>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <ProviderList
            providers={providers}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={(provider) => setDeleteTarget(provider)}
            onTest={handleTest}
            onToggle={handleToggle}
          />
        </TabsContent>

        {/* 기능별 매핑 서브탭 */}
        <TabsContent value="mappings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-200" />
                  </div>
                  <CardTitle className="text-base">태그 기반 자동 매칭</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  태그 조건(vision, function_calling 등)에 맞는 모델을 자동으로 선택합니다.
                  우선순위가 높은 규칙부터 적용됩니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Info className="h-4 w-4 text-purple-600 dark:text-purple-200" />
                  </div>
                  <CardTitle className="text-base">직접 모델 지정</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  특정 제공자와 모델을 직접 지정하여 사용합니다.
                  정확한 모델 선택이 필요한 경우에 적합합니다.
                </p>
              </CardContent>
            </Card>
          </div>

          {activeProviders.length === 0 ? (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                  <span>
                    활성화된 LLM 제공자가 없습니다.
                    <Link href="/admin/llm-providers" className="underline font-medium ml-1">
                      제공자를 먼저 등록해주세요.
                    </Link>
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <FeatureMappingList
              mappings={mappings}
              providers={providers.map((p) => ({
                id: p.id,
                name: p.name,
                models: (p.models || []).map((m) => ({
                  id: m.id,
                  modelId: m.modelId,
                  displayName: m.displayName,
                })),
              }))}
            />
          )}
        </TabsContent>

        {/* 사용량 서브탭 */}
        <TabsContent value="usage" className="space-y-6">
          <UsageSubTab
            dailyCost={dailyCost}
            weeklyCost={weeklyCost}
            monthlyCost={monthlyCost}
            dailyUsageData={dailyUsageData}
            providerUsageData={providerUsageData}
            featureUsageData={featureUsageData}
            usageSummary={usageSummary}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="LLM 제공자 삭제"
        description={`정말 "${deleteTarget?.name}" 제공자를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/**
 * 사용량 서브탭 (lazy import로 차트 컴포넌트 로드)
 */
import dynamic from 'next/dynamic';

const UsageCharts = dynamic(
  () => import('@/components/admin/llm-usage/usage-charts').then((mod) => mod.UsageCharts),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded-lg" /> }
);

const CostSummaryCards = dynamic(
  () => import('@/components/admin/llm-usage/cost-alerts').then((mod) => mod.CostSummaryCards),
  { ssr: false }
);

const CostAlerts = dynamic(
  () => import('@/components/admin/llm-usage/cost-alerts').then((mod) => mod.CostAlerts),
  { ssr: false }
);

function UsageSubTab({
  dailyCost,
  weeklyCost,
  monthlyCost,
  dailyUsageData,
  providerUsageData,
  featureUsageData,
  usageSummary,
}: {
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  dailyUsageData: DailyUsageData[];
  providerUsageData: ProviderUsageData[];
  featureUsageData: FeatureUsageData[];
  usageSummary: BudgetSummary[];
}) {
  return (
    <>
      <CostSummaryCards
        dailyCost={dailyCost}
        weeklyCost={weeklyCost}
        monthlyCost={monthlyCost}
      />
      <UsageCharts
        dailyData={dailyUsageData}
        providerData={providerUsageData}
        featureData={featureUsageData}
      />
      <CostAlerts initialData={usageSummary} />
    </>
  );
}
