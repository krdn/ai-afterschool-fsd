'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  getCapabilityLabel,
  filterDisplayCapabilities,
  getCostTierLabel,
  getCostTierBorderStyle,
  getQualityTierLabel,
  getQualityTierBorderStyle,
  formatContextWindow,
} from '@/shared/utils/llm-display';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit,
  Trash2,
  TestTube,
  Server,
  Sparkles,
  DollarSign,
  Gauge,
  ChevronDown,
  ChevronUp,
  Brain,
  Pin,
  Key,
} from 'lucide-react';
import type { ProviderWithModels } from '@/features/ai-engine';

interface ProviderCardProps {
  provider: ProviderWithModels;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => Promise<{ success: boolean; message: string }>;
  onToggle: (enabled: boolean) => void;
}

/**
 * 제공자 카드 컴포넌트
 * 
 * 개별 제공자의 정보를 표시하고 관리하는 카드 UI
 */
export function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onTest,
  onToggle,
}: ProviderCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    success: boolean;
    message?: string;
  }>({
    tested: Boolean(provider.isValidated),
    success: Boolean(provider.isValidated),
  });

  const [showModels, setShowModels] = useState(false);

  // 연결 테스트 실행
  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await onTest();
      setTestStatus({
        tested: true,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      setTestStatus({
        tested: true,
        success: false,
        message: error instanceof Error ? error.message : '테스트 실패',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 상태 배지 렌더링
  const renderStatusBadge = () => {
    if (!testStatus.tested) {
      return (
        <Badge variant="secondary" className="gap-1">
          <HelpCircle className="w-3 h-3" />
          미검증
        </Badge>
      );
    }

    if (testStatus.success) {
      return (
        <Badge
          variant="default"
          className="gap-1 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="w-3 h-3" />
          연결됨
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" />
        연결 실패
      </Badge>
    );
  };

  // 활성화 상태 배지
  const renderEnabledBadge = () => (
    <Badge
      variant={provider.isEnabled ? 'default' : 'secondary'}
      className={cn(
        'gap-1',
        provider.isEnabled
          ? ''
          : 'text-muted-foreground'
      )}
    >
      <Server className="w-3 h-3" />
      {provider.isEnabled ? '활성' : '비활성'}
    </Badge>
  );

  // 기능 태그 렌더링 (text 제외)
  const renderCapabilityBadges = () => {
    const caps = filterDisplayCapabilities((provider.capabilities as string[]) || []);
    if (caps.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {caps.slice(0, 4).map((cap) => (
          <Badge key={cap} variant="outline" className="text-xs">
            {getCapabilityLabel(cap)}
          </Badge>
        ))}
        {caps.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{caps.length - 4}
          </Badge>
        )}
      </div>
    );
  };

  // 티어 배지 렌더링
  const renderTierBadges = () => (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn('text-xs gap-1', getCostTierBorderStyle(provider.costTier as string))}
      >
        <DollarSign className="w-3 h-3" />
        {getCostTierLabel(provider.costTier as string)}
      </Badge>

      <Badge
        variant="outline"
        className={cn('text-xs gap-1', getQualityTierBorderStyle(provider.qualityTier as string))}
      >
        <Gauge className="w-3 h-3" />
        {getQualityTierLabel(provider.qualityTier as string)}
      </Badge>
    </div>
  );

  return (
    <Card className={cn(
      'transition-all duration-200 min-h-[280px] flex flex-col',
      !provider.isEnabled && 'opacity-60 border-l-4 border-l-gray-300'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* 제공자 아이콘/이니셜 */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold">
              {(provider.name || '').charAt(0)}
            </div>

            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {provider.name}
                {'isDefault' in provider && Boolean(provider.isDefault) && (
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {provider.providerType}
                </Badge>
                {renderStatusBadge()}
                {renderEnabledBadge()}
              </div>
            </div>
          </div>

          {/* 활성화 토글 */}
          <div className="flex items-center gap-2">
            <Switch
              checked={provider.isEnabled}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4 flex-1 flex flex-col">
        {/* URL 정보 */}
        {provider.baseUrl ? (
          <p className="text-sm text-muted-foreground truncate">
            {provider.baseUrl}
          </p>
        ) : null}

        {/* 기본 모델 (접힌 상태에서도 표시) */}
        {(() => {
          const defaultModel = provider.models?.find(m => m.isDefault);
          if (!defaultModel) return null;
          return (
            <div className="flex items-center gap-2 text-sm">
              <Pin className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">기본 모델:</span>
              <span>{defaultModel.displayName}</span>
              {defaultModel.contextWindow && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {formatContextWindow(defaultModel.contextWindow)}
                </Badge>
              )}
            </div>
          );
        })()}

        {/* API 키 상태 - hasApiKey 필드 사용 */}
        {provider.hasApiKey && (
          <div className="flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">
              API 키 등록됨
            </span>
          </div>
        )}

        {/* 모델 수 & 토글 */}
        <div 
          className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
          onClick={() => setShowModels(!showModels)}
        >
          <Server className="w-4 h-4 text-muted-foreground" />
          <span>{(provider.models?.length || 0)}개 모델 등록됨</span>
          {showModels ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* 모델 리스트 */}
        {showModels && provider.models && provider.models.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">등록된 모델:</p>
            <div className="space-y-1">
              {provider.models.map((model) => (
                <div
                  key={model.id}
                  className={cn(
                    "flex items-center gap-2 text-sm py-1 px-2 rounded",
                    model.isDefault 
                      ? "bg-yellow-50 border border-yellow-200 hover:bg-yellow-100" 
                      : "hover:bg-muted"
                  )}
                >
                  {model.isDefault ? (
                    <Pin className="w-3 h-3 text-yellow-500" />
                  ) : (
                    <Brain className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="font-medium">{model.displayName || model.modelId}</span>
                  {model.isDefault && (
                    <Badge className="bg-yellow-500 text-white text-[10px] h-4 px-1">
                      기본
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                    {model.contextWindow && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {formatContextWindow(model.contextWindow)}
                      </span>
                    )}
                    <span>({model.modelId})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 기능 태그 */}
        {renderCapabilityBadges()}

        {/* 티어 정보 */}
        {renderTierBadges()}

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2 mt-auto border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            className="gap-1"
          >
            <TestTube className="w-4 h-4" />
            {isTesting ? '테스트 중...' : '연결 테스트'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit()}
            className="gap-1"
          >
            <Edit className="w-4 h-4" />
            편집
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>제공자 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  정말로 <strong>{provider.name}</strong> 제공자를 삭제하시겠습니까?
                  이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

