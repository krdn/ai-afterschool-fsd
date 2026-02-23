import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProviderFromTemplateAction,
  updateProviderAction,
  validateProviderAction,
  syncProviderModelsAction,
  setDefaultModelAction,
} from '@/lib/actions/admin/providers';
import type { ProviderWithModels, ProviderInput, Capability } from '@/features/ai-engine';
import type { ProviderTemplate } from '@/features/ai-engine';
import { providerFormSchema, type ProviderFormValues } from './provider-form-schema';

export interface ProviderFormProps {
  provider?: ProviderWithModels;
  template?: ProviderTemplate;
  onSuccess?: () => void;
  onProviderUpdate?: (provider: ProviderWithModels) => void;
}

/**
 * 제공자 폼의 상태 관리 및 핸들러 로직을 담당하는 커스텀 훅
 */
export function useProviderForm({ provider, template, onSuccess, onProviderUpdate }: ProviderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    null
  );
  const [syncedModels, setSyncedModels] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const isEditing = !!provider;

  // 폼 초기화
  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema) as never,
    defaultValues: {
      name: '',
      providerType: 'custom',
      baseUrl: '',
      authType: 'api_key',
      customAuthHeader: '',
      apiKey: '',
      capabilities: [],
      costTier: 'medium',
      qualityTier: 'balanced',
      isEnabled: false,
    },
  });

  // 템플릿이나 기존 제공자로 폼 초기값 설정
  useEffect(() => {
    if (provider) {
      // 기존 제공자 수정
      form.reset({
        name: provider.name,
        providerType: provider.providerType as ProviderFormValues['providerType'],
        baseUrl: provider.baseUrl || '',
        authType: provider.authType as ProviderFormValues['authType'],
        customAuthHeader: provider.customAuthHeader || '',
        apiKey: '', // API 키는 표시하지 않음
        capabilities: provider.capabilities as Capability[],
        costTier: provider.costTier as ProviderFormValues['costTier'],
        qualityTier: provider.qualityTier as ProviderFormValues['qualityTier'],
        isEnabled: provider.isEnabled,
      });

      // 기본 모델 선택 상태 초기화
      const defaultModel = provider.models?.find(m => m.isDefault);
      if (defaultModel) {
        setSelectedModel(defaultModel.modelId);
      }
    } else if (template) {
      // 템플릿 기반 새 제공자
      form.reset({
        name: template.name,
        providerType: template.providerType as ProviderFormValues['providerType'],
        baseUrl: template.defaultBaseUrl || '',
        authType: template.defaultAuthType as ProviderFormValues['authType'],
        customAuthHeader: template.customAuthHeaderName || '',
        apiKey: '',
        capabilities: template.defaultCapabilities,
        costTier: template.defaultCostTier as ProviderFormValues['costTier'],
        qualityTier: template.defaultQualityTier as ProviderFormValues['qualityTier'],
        isEnabled: false,
      });
    }
  }, [provider, template, form]);

  // 폼 제출 핸들러
  const onSubmit = async (values: ProviderFormValues) => {
    setIsSubmitting(true);
    setTestResult(null);

    try {
      const input: Partial<ProviderInput> = {
        ...values,
        baseUrl: values.baseUrl || undefined,
        customAuthHeader: values.customAuthHeader || undefined,
        apiKey: values.apiKey || undefined,
        capabilities: values.capabilities as Capability[],
      };

      if (isEditing && provider) {
        // 수정
        await updateProviderAction(provider.id, input);
      } else if (template) {
        // 템플릿 기반 생성
        await createProviderFromTemplateAction(template.templateId, input);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save provider:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '저장에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // provider 데이터 재로드 (동기화 후 UI 갱신용)
  const reloadProvider = async () => {
    if (!provider) return;
    try {
      const response = await fetch(`/api/providers/${provider.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.provider) {
          onProviderUpdate?.(data.provider);
          // 기본 모델 선택 상태도 갱신
          const defaultModel = data.provider.models?.find((m: { isDefault: boolean }) => m.isDefault);
          if (defaultModel) {
            setSelectedModel(defaultModel.modelId);
          }
        }
      }
    } catch {
      // 재로드 실패는 무시 (데이터는 이미 서버에 저장됨)
    }
  };

  // 모델 동기화
  const handleSyncModels = async () => {
    if (!provider) {
      setTestResult({
        success: false,
        message: '먼저 제공자를 저장한 후 동기화할 수 있습니다.',
      });
      return;
    }

    setIsSyncing(true);
    setTestResult(null);

    try {
      const models = await syncProviderModelsAction(provider.id);
      setSyncedModels(models.length);
      setTestResult({
        success: true,
        message: `${models.length}개의 모델이 동기화되었습니다.`,
      });
      // 동기화 후 provider 데이터 재로드하여 모델 목록 UI 갱신
      await reloadProvider();
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '동기화 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 연결 테스트
  const handleTestConnection = async () => {
    if (!provider) {
      setTestResult({
        success: false,
        message: '먼저 제공자를 저장한 후 테스트할 수 있습니다.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // 현재 폼 값을 먼저 저장하여 DB와 동기화
      const values = form.getValues();
      const input: Partial<ProviderInput> = {
        ...values,
        baseUrl: values.baseUrl || undefined,
        customAuthHeader: values.customAuthHeader || undefined,
        apiKey: values.apiKey || undefined,
        capabilities: values.capabilities as Capability[],
      };
      await updateProviderAction(provider.id, input);

      const result = await validateProviderAction(provider.id);
      if (result.isValid) {
        setTestResult({
          success: true,
          message: result.error ? `⚠ ${result.error}` : '연결 성공! 모델을 동기화합니다...',
        });
        // 연결 성공 시 자동으로 모델 동기화 실행
        setIsTesting(false);
        await handleSyncModels();
        return;
      } else {
        setTestResult({
          success: false,
          message: `연결 실패: ${result.error || '알 수 없는 오류'}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '테스트 중 오류가 발생했습니다.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 기본 모델 설정 핸들러
  const handleSetDefaultModel = async (modelId: string) => {
    setSelectedModel(modelId);
    if (provider && modelId) {
      try {
        const selectedModelData = provider.models?.find(m => m.modelId === modelId);
        if (selectedModelData) {
          await setDefaultModelAction(provider.id, selectedModelData.id);
          setTestResult({
            success: true,
            message: `기본 모델이 "${selectedModelData.displayName || selectedModelData.modelId}"(으)로 설정되었습니다.`,
          });
        }
      } catch (error) {
        setTestResult({
          success: false,
          message: error instanceof Error ? error.message : '기본 모델 설정에 실패했습니다.',
        });
      }
    }
  };

  const authType = form.watch('authType');
  const selectedCapabilities = form.watch('capabilities');

  return {
    form,
    isSubmitting,
    isTesting,
    isSyncing,
    testResult,
    setTestResult,
    syncedModels,
    selectedModel,
    setSelectedModel,
    showApiKey,
    setShowApiKey,
    isEditing,
    onSubmit,
    handleTestConnection,
    handleSyncModels,
    handleSetDefaultModel,
    authType,
    selectedCapabilities,
  };
}
