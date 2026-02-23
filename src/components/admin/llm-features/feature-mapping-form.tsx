'use client';

/**
 * Feature Mapping Form Component
 * 
 * 기능별 LLM 매핑 규칙을 설정하는 폼 컴포넌트
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResolutionPreview } from './resolution-preview';
import {
  createFeatureMappingAction,
  updateFeatureMappingAction,
} from '@/lib/actions/admin/feature-mappings';
import type {
  FeatureMappingInput,
  MatchMode,
  FallbackMode,
  CostTier,
  QualityTier,
} from '@/features/ai-engine';

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

// 태그 옵션
const TAG_OPTIONS = [
  { value: 'vision', label: 'Vision', description: '이미지 인식 지원' },
  { value: 'function_calling', label: 'Function Calling', description: '함수 호출 지원' },
  { value: 'json_mode', label: 'JSON Mode', description: 'JSON 출력 지원' },
  { value: 'streaming', label: 'Streaming', description: '스트리밍 지원' },
];

// 비용 등급 옵션
const COST_TIERS: { value: CostTier; label: string }[] = [
  { value: 'free', label: '묶음' },
  { value: 'low', label: '저렴' },
  { value: 'medium', label: '중간' },
  { value: 'high', label: '비쌈' },
];

// 품질 등급 옵션
const QUALITY_TIERS: { value: QualityTier; label: string }[] = [
  { value: 'fast', label: '빠른' },
  { value: 'balanced', label: '균형' },
  { value: 'premium', label: '프리미엄' },
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
    displayName: string;
    provider: {
      id: string;
      name: string;
    };
  } | null;
}

interface FeatureMappingFormProps {
  mapping?: FeatureMappingWithDetails;
  featureType?: string;
  providers: ProviderWithModels[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeatureMappingForm({
  mapping,
  featureType: initialFeatureType,
  providers,
  onSuccess,
  onCancel,
}: FeatureMappingFormProps) {
  const isEditing = !!mapping;

  // 폼 상태
  const [selectedFeatureType, setSelectedFeatureType] = useState(initialFeatureType || '');
  const [matchMode, setMatchMode] = useState<MatchMode>(mapping?.matchMode || 'auto_tag');
  const [requiredTags, setRequiredTags] = useState<string[]>(mapping?.requiredTags || []);
  const [excludedTags, setExcludedTags] = useState<string[]>(mapping?.excludedTags || []);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>(mapping?.specificModelId || '');
  const [priority, setPriority] = useState(mapping?.priority?.toString() || '1');
  const [fallbackMode, setFallbackMode] = useState<FallbackMode>(
    mapping?.fallbackMode || 'next_priority'
  );
  const [preferredCost, setPreferredCost] = useState<CostTier | ''>('');
  const [preferredQuality, setPreferredQuality] = useState<QualityTier | ''>('');
  const [minContextWindow, setMinContextWindow] = useState('');

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // 선택된 제공자의 모델 목록
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const availableModels = selectedProvider?.models || [];

  // 수정 모드일 때 초기값 설정
  useEffect(() => {
    if (mapping?.specificModel) {
      setSelectedProviderId(mapping.specificModel.provider.id);
      // provider가 설정되면 model도 설정
      setTimeout(() => {
        setSelectedModelId(mapping.specificModelId || '');
      }, 0);
    }
  }, [mapping]);

  // 제공자 변경 시 모델 선택 초기화
  useEffect(() => {
    if (!isEditing) {
      setSelectedModelId('');
    }
  }, [selectedProviderId, isEditing]);

  const handleTagToggle = (tag: string, type: 'required' | 'excluded') => {
    if (type === 'required') {
      setRequiredTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
      // required에서 제외된 태그는 excluded에서 제거
      setExcludedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setExcludedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
      // excluded에서 추가된 태그는 required에서 제거
      setRequiredTags((prev) => prev.filter((t) => t !== tag));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const input: FeatureMappingInput = {
        featureType: selectedFeatureType,
        matchMode,
        requiredTags: matchMode === 'auto_tag' ? requiredTags : [],
        excludedTags: matchMode === 'auto_tag' ? excludedTags : [],
        specificModelId: matchMode === 'specific_model' ? selectedModelId : null,
        priority: parseInt(priority, 10) || 1,
        fallbackMode,
      };

      let result;
      if (isEditing) {
        result = await updateFeatureMappingAction(mapping.id, input);
      } else {
        result = await createFeatureMappingAction(input);
      }

      if (!result.success) {
        setError(result.error || '저장에 실패했습니다.');
        return;
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getFeatureTypeLabel = (value: string) => {
    return FEATURE_TYPES.find((f) => f.value === value)?.label || value;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* 기능 선택 */}
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="featureType">기능</Label>
          <Select value={selectedFeatureType} onValueChange={setSelectedFeatureType} required>
            <SelectTrigger id="featureType">
              <SelectValue placeholder="기능을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {FEATURE_TYPES.map((feature) => (
                <SelectItem key={feature.value} value={feature.value}>
                  {feature.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isEditing && (
        <div className="space-y-2">
          <Label>기능</Label>
          <div className="p-2 border rounded-md bg-muted">
            {getFeatureTypeLabel(mapping.featureType)}
          </div>
        </div>
      )}

      {/* 매칭 모드 선택 */}
      <div className="space-y-3">
        <Label>매칭 모드</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMatchMode('auto_tag')}
            className={cn(
              'flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-colors',
              matchMode === 'auto_tag'
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="font-semibold">태그 기반 자동 매칭</span>
            <span className="text-xs text-muted-foreground mt-1">
              태그 조건에 맞는 모델 자동 선택
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMatchMode('specific_model')}
            className={cn(
              'flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-colors',
              matchMode === 'specific_model'
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="font-semibold">직접 모델 지정</span>
            <span className="text-xs text-muted-foreground mt-1">특정 모델 직접 선택</span>
          </button>
        </div>
      </div>

      {/* 태그 기반 모드 설정 */}
      {matchMode === 'auto_tag' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">태그 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 필수 태그 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">필수 태그 (모두 충족해야 함)</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <div key={tag.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`required-${tag.value}`}
                      checked={requiredTags.includes(tag.value)}
                      onCheckedChange={() => handleTagToggle(tag.value, 'required')}
                    />
                    <Label htmlFor={`required-${tag.value}`} className="text-sm cursor-pointer">
                      <Badge variant="default" className="font-normal">
                        {tag.label}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 제외 태그 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">제외 태그 (제외할 조건)</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <div key={tag.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`excluded-${tag.value}`}
                      checked={excludedTags.includes(tag.value)}
                      onCheckedChange={() => handleTagToggle(tag.value, 'excluded')}
                    />
                    <Label htmlFor={`excluded-${tag.value}`} className="text-sm cursor-pointer">
                      <Badge variant="secondary" className="font-normal line-through">
                        {tag.label}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 추가 필터 */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">선호 비용 등급</Label>
                <Select
                  value={preferredCost}
                  onValueChange={(value) => setPreferredCost(value as CostTier)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {COST_TIERS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">선호 품질 등급</Label>
                <Select
                  value={preferredQuality}
                  onValueChange={(value) => setPreferredQuality(value as QualityTier)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {QUALITY_TIERS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">최소 컨텍스트 윈도우</Label>
                <Input
                  type="number"
                  placeholder="예: 4000"
                  value={minContextWindow}
                  onChange={(e) => setMinContextWindow(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 직접 지정 모드 설정 */}
      {matchMode === 'specific_model' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">모델 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">제공자</Label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId} required>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="제공자를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">모델</Label>
              <Select
                value={selectedModelId}
                onValueChange={setSelectedModelId}
                disabled={!selectedProviderId || availableModels.length === 0}
                required
              >
                <SelectTrigger id="model">
                  <SelectValue
                    placeholder={
                      !selectedProviderId
                        ? '제공자를 먼저 선택하세요'
                        : availableModels.length === 0
                          ? '사용 가능한 모델이 없습니다'
                          : '모델을 선택하세요'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.displayName} ({model.modelId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 우선순위 */}
      <div className="space-y-2">
        <Label htmlFor="priority">우선순위</Label>
        <div className="flex items-center gap-4">
          <Input
            id="priority"
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            낮을수록 먼저 시도됩니다 (1 = 최우선)
          </span>
        </div>
      </div>

      {/* 폴 백 전략 */}
      <div className="space-y-2">
        <Label htmlFor="fallbackMode">폴 백 전략</Label>
        <Select value={fallbackMode} onValueChange={(value) => setFallbackMode(value as FallbackMode)}>
          <SelectTrigger id="fallbackMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next_priority">다음 우선순위 시도</SelectItem>
            <SelectItem value="any_available">사용 가능한任何 모델</SelectItem>
            <SelectItem value="fail">실패 처리</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {fallbackMode === 'next_priority' && '첫 번째 모델 실패 시 다음 우선순위 모델로 폴 백합니다.'}
          {fallbackMode === 'any_available' && '규칙에 맞는 사용 가능한 모델 중 자동으로 선택합니다.'}
          {fallbackMode === 'fail' && '폴 백 없이 실패 처리합니다.'}
        </p>
      </div>

      {/* 미리보기 */}
      {selectedFeatureType && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">결과 미리보기</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? '숨기기' : '보기'}
              </Button>
            </div>
          </CardHeader>
          {showPreview && (
            <CardContent>
              <ResolutionPreview
                featureType={selectedFeatureType}
                requirements={{
                  needsVision: requiredTags.includes('vision'),
                  needsTools: requiredTags.includes('function_calling'),
                  preferredCost: preferredCost || undefined,
                  preferredQuality: preferredQuality || undefined,
                  minContextWindow: minContextWindow ? parseInt(minContextWindow, 10) : undefined,
                }}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          <X className="h-4 w-4 mr-2" />
          취소
        </Button>
        <Button type="submit" disabled={loading || !selectedFeatureType}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? '저장 중...' : isEditing ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
