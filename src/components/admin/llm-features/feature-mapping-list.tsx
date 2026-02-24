'use client';

/**
 * Feature Mapping List Component
 * 
 * 기능별 매핑 규칙 목록을 표시하고 관리하는 컴포넌트
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { FeatureMappingCard } from './feature-mapping-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FeatureMappingForm } from './feature-mapping-form';
import {
  deleteFeatureMappingAction,
  updateFeatureMappingAction,
} from '@/lib/actions/admin/feature-mappings';
import type { MatchMode, FallbackMode } from '@/features/ai-engine';

// Feature 타입 목록
const FEATURE_TYPES = [
  { value: 'learning_analysis', label: '학습 분석' },
  { value: 'face_analysis', label: '관상 분석' },
  { value: 'palm_analysis', label: '손금 분석' },
  { value: 'counseling', label: '상담' },
  { value: 'report_generation', label: '보고서 생성' },
  { value: 'recommendation', label: '추천' },
  { value: 'content_generation', label: '콘텐츠 생성' },
  { value: 'translation', label: '번역' },
  { value: 'summarization', label: '요약' },
  { value: 'classification', label: '분류' },
  { value: 'embedding', label: '임베딩' },
  { value: 'image_analysis', label: '이미지 분석' },
];

interface ProviderWithModels {
  id: string;
  name: string;
  models: {
    id: string;
    modelId: string;
    displayName: string;
  }[];
}

interface FeatureMappingWithDetails {
  id: string;
  featureType: string;
  matchMode: MatchMode;
  requiredTags: string[];
  excludedTags: string[];
  specificModelId: string | null;
  priority: number;
  fallbackMode: FallbackMode;
  specificModel?: {
    id: string;
    modelId: string;
    displayName: string;
    contextWindow: number | null;
    supportsVision: boolean;
    supportsTools: boolean;
    provider: {
      id: string;
      name: string;
    };
  } | null;
}

interface FeatureMappingListProps {
  mappings: FeatureMappingWithDetails[];
  providers: ProviderWithModels[];
}

export function FeatureMappingList({ mappings, providers }: FeatureMappingListProps) {
  const router = useRouter();
  const onRefresh = useCallback(() => router.refresh(), [router]);
  const [editingMapping, setEditingMapping] = useState<FeatureMappingWithDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFeatureType, setSelectedFeatureType] = useState<string>('');

  // 기능별로 매핑 그룹화
  const groupedMappings = useMemo(() => {
    const groups: Record<string, FeatureMappingWithDetails[]> = {};

    // 모든 기능 타입에 대해 그룹 초기화
    FEATURE_TYPES.forEach((type) => {
      groups[type.value] = [];
    });

    // 매핑을 기능별로 분류
    mappings.forEach((mapping) => {
      if (!groups[mapping.featureType]) {
        groups[mapping.featureType] = [];
      }
      groups[mapping.featureType].push(mapping);
    });

    // 각 그룹 내에서 우선순위순 정렬 (높은 우선순위가 먼저)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.priority - a.priority);
    });

    return groups;
  }, [mappings]);

  // 매핑이 있는 기능 타입만 필터링
  const activeFeatureTypes = useMemo(() => {
    return FEATURE_TYPES.filter((type) => groupedMappings[type.value]?.length > 0);
  }, [groupedMappings]);

  // 활성 탭 상태
  const [activeTab, setActiveTab] = useState<string>(activeFeatureTypes[0]?.value || '');

  const handleEdit = (mapping: FeatureMappingWithDetails) => {
    setEditingMapping(mapping);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (mappingId: string) => {
    const result = await deleteFeatureMappingAction(mappingId);
    if (result.success) {
      onRefresh();
    }
  };

  const handleMoveUp = async (mapping: FeatureMappingWithDetails) => {
    const group = groupedMappings[mapping.featureType];
    const currentIndex = group.findIndex((m) => m.id === mapping.id);
    if (currentIndex <= 0) return;

    const prevMapping = group[currentIndex - 1];
    // 현재 매핑의 우선순위를 이전 매핑의 우선순위로 설정
    const newPriority = prevMapping.priority;

    const result = await updateFeatureMappingAction(mapping.id, {
      priority: newPriority,
    });

    if (result.success) {
      onRefresh();
    }
  };

  const handleMoveDown = async (mapping: FeatureMappingWithDetails) => {
    const group = groupedMappings[mapping.featureType];
    const currentIndex = group.findIndex((m) => m.id === mapping.id);
    if (currentIndex >= group.length - 1) return;

    const nextMapping = group[currentIndex + 1];
    // 현재 매핑의 우선순위를 다음 매핑의 우선순위보다 낮게 설정
    const newPriority = nextMapping.priority - 1;

    const result = await updateFeatureMappingAction(mapping.id, {
      priority: newPriority,
    });

    if (result.success) {
      onRefresh();
    }
  };

  const handleSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingMapping(null);
    onRefresh();
  };

  const getFeatureTypeLabel = (value: string) => {
    return FEATURE_TYPES.find((f) => f.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* 전체 요약 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>기능별 매핑 현황</CardTitle>
              <CardDescription>
                총 {mappings.length}개의 매핑 규칙이 등록되어 있습니다.
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  규칙 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>새 매핑 규칙 생성</DialogTitle>
                </DialogHeader>
                <FeatureMappingForm
                  providers={providers}
                  onSuccess={handleSuccess}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {activeFeatureTypes.map((type) => (
              <Badge key={type.value} variant="secondary" className="gap-1">
                {type.label}
                <span className="text-xs opacity-70">
                  ({groupedMappings[type.value].length})
                </span>
              </Badge>
            ))}
            {activeFeatureTypes.length === 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>등록된 매핑 규칙이 없습니다.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 기능별 탭 */}
      {activeFeatureTypes.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {activeFeatureTypes.map((type) => (
              <TabsTrigger key={type.value} value={type.value} className="gap-1">
                {type.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {groupedMappings[type.value].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {activeFeatureTypes.map((type) => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{getFeatureTypeLabel(type.value)} 매핑 규칙</h3>
                <Dialog open={isCreateDialogOpen && selectedFeatureType === type.value} onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (open) setSelectedFeatureType(type.value);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      규칙 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>새 매핑 규칙 생성</DialogTitle>
                    </DialogHeader>
                    <FeatureMappingForm
                      featureType={type.value}
                      providers={providers}
                      onSuccess={handleSuccess}
                      onCancel={() => {
                        setIsCreateDialogOpen(false);
                        setSelectedFeatureType('');
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {groupedMappings[type.value].map((mapping, index) => (
                  <FeatureMappingCard
                    key={mapping.id}
                    mapping={{
                      ...mapping,
                      specificModel: mapping.specificModel || null,
                    }}
                    index={index}
                    onEdit={() => handleEdit(mapping)}
                    onDelete={() => handleDelete(mapping.id)}
                    onMoveUp={() => handleMoveUp(mapping)}
                    onMoveDown={() => handleMoveDown(mapping)}
                    isFirst={index === 0}
                    isLast={index === groupedMappings[type.value].length - 1}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>매핑 규칙 수정</DialogTitle>
          </DialogHeader>
          {editingMapping && (
            <FeatureMappingForm
              mapping={editingMapping}
              providers={providers}
              onSuccess={handleSuccess}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingMapping(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
