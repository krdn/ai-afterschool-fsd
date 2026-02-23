'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { InlineHelp } from '@/components/help/inline-help';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ALL_CAPABILITIES } from './provider-form-schema';
import { useProviderForm, type ProviderFormProps } from './use-provider-form';

/**
 * 제공자 등록/수정 폼 컴포넌트
 *
 * 템플릿 기반으로 생성하거나 직접 설정할 수 있습니다.
 */
export function ProviderForm(props: ProviderFormProps) {
  const { provider, template } = props;
  const {
    form,
    isSubmitting,
    isTesting,
    isSyncing,
    testResult,
    syncedModels,
    selectedModel,
    showApiKey,
    setShowApiKey,
    isEditing,
    onSubmit,
    handleTestConnection,
    handleSyncModels,
    handleSetDefaultModel,
    authType,
  } = useProviderForm(props);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    제공자명 *
                    <InlineHelp helpId="provider-name" />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: OpenAI GPT-4" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="providerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제공자 타입 *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!template && template.templateId !== 'custom'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="타입을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                      <SelectItem value="cohere">Cohere</SelectItem>
                      <SelectItem value="xai">xAI (Grok)</SelectItem>
                      <SelectItem value="zhipu">Zhipu AI</SelectItem>
                      <SelectItem value="moonshot">Moonshot AI</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="custom">Custom (OpenAI 호환)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 연결 설정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">연결 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Base URL
                    <InlineHelp helpId="provider-custom" />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://api.example.com/v1" />
                  </FormControl>
                  <FormDescription>
                    {template?.defaultBaseUrl
                      ? `기본값: ${template.defaultBaseUrl}`
                      : 'API 엔드포인트 URL을 입력하세요'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>인증 방식 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="인증 방식을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">없음 (로컬)</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="custom_header">Custom Header</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authType === 'custom_header' && (
              <FormField
                control={form.control}
                name="customAuthHeader"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Header 이름 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="X-API-Key" />
                    </FormControl>
                    <FormDescription>HTTP 헤더 이름을 입력하세요</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span>API Key</span>
                    <InlineHelp helpId="api-key-guide" />
                  </FormLabel>
                  {isEditing && provider?.hasApiKey && (
                    <FormDescription className="text-sm text-muted-foreground">
                      API 키 등록됨
                    </FormDescription>
                  )}
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showApiKey ? 'text' : 'password'}
                        placeholder={isEditing && provider?.hasApiKey ? '새 API 키를 입력하세요' : 'sk-...'}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-10 px-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  {isEditing && provider?.hasApiKey && field.value && (
                    <FormDescription>
                      새 키를 입력하면 기존 키가 대체됩니다.
                    </FormDescription>
                  )}
                  {template?.apiKeyInstructions && (
                    <FormDescription>{template.apiKeyInstructions}</FormDescription>
                  )}
                  {template?.apiKeyUrl && (
                    <FormDescription>
                      <a
                        href={template.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        API 키 발급 페이지 →
                      </a>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 기능 및 티어 설정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">기능 및 티어</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 기능 태그 */}
            <div>
              <FormLabel className="text-base flex items-center gap-1">
                지원 기능
                <InlineHelp helpId="capabilities" />
              </FormLabel>
              <div className="grid grid-cols-2 gap-4 mt-3">
                {ALL_CAPABILITIES.map((cap) => (
                  <FormField
                    key={cap.value}
                    control={form.control}
                    name="capabilities"
                    render={({ field }) => {
                      return (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(cap.value)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, cap.value])
                                  : field.onChange(
                                      field.value?.filter((value) => value !== cap.value)
                                    );
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {cap.label}
                            </FormLabel>
                            <FormDescription>{cap.description}</FormDescription>
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="border-t my-4" />

            {/* 비용 티어 */}
            <FormField
              control={form.control}
              name="costTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비용 등급 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="비용 등급을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">무료</SelectItem>
                      <SelectItem value="low">저렴</SelectItem>
                      <SelectItem value="medium">중간</SelectItem>
                      <SelectItem value="high">고가</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 품질 티어 */}
            <FormField
              control={form.control}
              name="qualityTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>품질 등급 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="품질 등급을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fast">빠름</SelectItem>
                      <SelectItem value="balanced">균형</SelectItem>
                      <SelectItem value="premium">프리미엄</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 모델 설정 - 수정 모드에서만 표시 */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">모델 설정</CardTitle>
            </CardHeader>
            <CardContent>
              {provider?.models && provider.models.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">기본 모델</label>
                  <Select
                    key={`${provider.id}-${selectedModel || 'empty'}`}
                    value={selectedModel || ''}
                    onValueChange={handleSetDefaultModel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="모델을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {provider.models.map((model) => (
                        <SelectItem key={model.id} value={model.modelId}>
                          {model.displayName || model.modelId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    이 제공자의 기본 모델을 선택합니다. ({provider.models.length}개 모델 등록됨)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncModels}
                    disabled={isSyncing}
                    className="mt-2"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        동기화 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        모델 재동기화
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    아직 동기화된 모델이 없습니다.
                    <br />
                    서버에서 모델 목록을 가져오려면 동기화 버튼을 클릭하세요.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncModels}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        동기화 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        모델 동기화
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 상태 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">상태</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">활성화</FormLabel>
                    <FormDescription>
                      활성화하면 라우터에서 이 제공자를 사용할 수 있습니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 테스트 결과 알림 */}
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* 동기화된 모델 표시 */}
        {syncedModels !== null && testResult?.success && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{syncedModels}개 모델 동기화됨</Badge>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex flex-wrap gap-3 pt-4">
          {isEditing && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || isSubmitting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    테스트 중...
                  </>
                ) : (
                  '연결 테스트'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSyncModels}
                disabled={isSyncing || isSubmitting}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    모델 동기화
                  </>
                )}
              </Button>
            </>
          )}

          <div className="flex-1" />

          <Button
            type="button"
            variant="outline"
            onClick={() => props.onSuccess?.()}
            disabled={isSubmitting}
          >
            취소
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : isEditing ? (
              '저장'
            ) : (
              '등록'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
