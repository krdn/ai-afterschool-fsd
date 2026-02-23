/**
 * Provider Templates
 *
 * 인기 LLM 제공자들의 템플릿을 정의합니다.
 * 템플릿을 기반으로 제공자를 쉽게 등록할 수 있습니다.
 */



/**
 * 제공자 템플릿 목록
 */
const providerTemplates: any[] = [
  // OpenAI (인기)
  {
    templateId: 'openai',
    name: 'OpenAI GPT',
    providerType: 'openai',
    description: 'OpenAI의 GPT 모델 시리즈. GPT-4o, GPT-4o-mini 등 다양한 모델 제공',
    logoUrl: '/images/providers/openai.svg',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'high',
    defaultQualityTier: 'premium',
    defaultModels: [
      {
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        contextWindow: 128000,
        supportsVision: true,
      },
      {
        modelId: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        contextWindow: 128000,
        supportsVision: true,
      },
      {
        modelId: 'o3-mini',
        displayName: 'o3 Mini',
        contextWindow: 200000,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'OpenAI Dashboard → API Keys → Create new secret key',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    helpUrl: 'https://platform.openai.com/docs',
    isPopular: true,
    sortOrder: 1,
  },

  // Anthropic (인기)
  {
    templateId: 'anthropic',
    name: 'Anthropic Claude',
    providerType: 'anthropic',
    description: 'Anthropic의 Claude 모델 시리즈. Claude Sonnet, Claude Opus 등 제공',
    logoUrl: '/images/providers/anthropic.svg',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'high',
    defaultQualityTier: 'premium',
    defaultModels: [
      {
        modelId: 'claude-sonnet-4-5',
        displayName: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        supportsVision: true,
      },
      {
        modelId: 'claude-3-5-haiku-latest',
        displayName: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        supportsVision: true,
      },
      {
        modelId: 'claude-opus-4',
        displayName: 'Claude Opus 4',
        contextWindow: 200000,
        supportsVision: true,
      },
    ],
    apiKeyInstructions: 'Anthropic Console → API Keys → Create Key',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    helpUrl: 'https://docs.anthropic.com',
    isPopular: true,
    sortOrder: 2,
  },

  // Google Gemini (인기)
  {
    templateId: 'google',
    name: 'Google Gemini',
    providerType: 'google',
    description: 'Google의 Gemini 모델 시리즈. Gemini 2.5 Flash, Gemini 2.0 Pro 등 제공',
    logoUrl: '/images/providers/google.svg',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'medium',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'gemini-2.5-flash-preview-05-20',
        displayName: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        supportsVision: true,
      },
      {
        modelId: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        supportsVision: true,
      },
      {
        modelId: 'gemini-2.0-flash-lite',
        displayName: 'Gemini 2.0 Flash Lite',
        contextWindow: 1048576,
        supportsVision: true,
      },
    ],
    apiKeyInstructions: 'Google AI Studio → Get API Key → Create API Key',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    helpUrl: 'https://ai.google.dev/docs',
    isPopular: true,
    sortOrder: 3,
  },

  // Ollama (로컬, 물뤂)
  {
    templateId: 'ollama',
    name: 'Ollama',
    providerType: 'ollama',
    description: '로컬 환경에서 실행되는 오픈소스 LLM. Llama, Mistral, Phi 등 지원',
    logoUrl: '/images/providers/ollama.svg',
    defaultBaseUrl: 'http://localhost:11434/api',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['streaming', 'tools'],
    defaultCostTier: 'free',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'llama3.2:3b',
        displayName: 'Llama 3.2 (3B)',
        contextWindow: 8192,
        supportsVision: false,
      },
      {
        modelId: 'mistral:7b',
        displayName: 'Mistral (7B)',
        contextWindow: 8192,
        supportsVision: false,
      },
      {
        modelId: 'phi4',
        displayName: 'Phi-4',
        contextWindow: 16384,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'Ollama는 로컬 실행 시 API 키가 필요 없습니다. ollama serve로 서버를 시작하세요.',
    apiKeyUrl: 'https://ollama.com/download',
    helpUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    isPopular: true,
    sortOrder: 4,
  },

  // DeepSeek
  {
    templateId: 'deepseek',
    name: 'DeepSeek',
    providerType: 'deepseek',
    description: 'DeepSeek AI의 모델. DeepSeek Chat, DeepSeek Reasoner 제공',
    logoUrl: '/images/providers/deepseek.svg',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'low',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
        contextWindow: 64000,
        supportsVision: false,
      },
      {
        modelId: 'deepseek-reasoner',
        displayName: 'DeepSeek Reasoner',
        contextWindow: 64000,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'DeepSeek Platform → API Keys → Create API Key',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    helpUrl: 'https://platform.deepseek.com/docs',
    isPopular: false,
    sortOrder: 10,
  },

  // Mistral AI
  {
    templateId: 'mistral',
    name: 'Mistral AI',
    providerType: 'mistral',
    description: 'Mistral AI의 모델. Mistral Large, Mistral Medium, Codestral 등 제공',
    logoUrl: '/images/providers/mistral.svg',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'medium',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'mistral-large-latest',
        displayName: 'Mistral Large',
        contextWindow: 128000,
        supportsVision: false,
      },
      {
        modelId: 'mistral-medium-latest',
        displayName: 'Mistral Medium',
        contextWindow: 128000,
        supportsVision: false,
      },
      {
        modelId: 'codestral-latest',
        displayName: 'Codestral',
        contextWindow: 32000,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'Mistral AI Console → API Keys → Create API Key',
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    helpUrl: 'https://docs.mistral.ai/',
    isPopular: false,
    sortOrder: 11,
  },

  // Cohere
  {
    templateId: 'cohere',
    name: 'Cohere',
    providerType: 'cohere',
    description: 'Cohere의 모델. Command R, Command R+ 등 제공',
    logoUrl: '/images/providers/cohere.svg',
    defaultBaseUrl: 'https://api.cohere.com/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['function_calling', 'streaming', 'tools'],
    defaultCostTier: 'medium',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'command-r-plus',
        displayName: 'Command R+',
        contextWindow: 128000,
        supportsVision: false,
      },
      {
        modelId: 'command-r',
        displayName: 'Command R',
        contextWindow: 128000,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'Cohere Dashboard → API Keys → Create API Key',
    apiKeyUrl: 'https://dashboard.cohere.com/api-keys',
    helpUrl: 'https://docs.cohere.com/',
    isPopular: false,
    sortOrder: 12,
  },

  // xAI (Grok)
  {
    templateId: 'xai',
    name: 'xAI Grok',
    providerType: 'xai',
    description: 'xAI의 Grok 모델 시리즈. Grok 3 등 제공',
    logoUrl: '/images/providers/xai.svg',
    defaultBaseUrl: 'https://api.x.ai/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'medium',
    defaultQualityTier: 'premium',
    defaultModels: [
      {
        modelId: 'grok-3',
        displayName: 'Grok 3',
        contextWindow: 131072,
        supportsVision: true,
      },
      {
        modelId: 'grok-3-fast',
        displayName: 'Grok 3 Fast',
        contextWindow: 131072,
        supportsVision: true,
      },
    ],
    apiKeyInstructions: 'xAI Console → API Keys → Create API Key',
    apiKeyUrl: 'https://console.x.ai/',
    helpUrl: 'https://docs.x.ai/',
    isPopular: false,
    sortOrder: 13,
  },

  // Zhipu AI (중국)
  {
    templateId: 'zhipu',
    name: 'Zhipu AI (智谱AI)',
    providerType: 'zhipu',
    description: '중국 Zhipu AI의 GLM 모델 시리즈. GLM-4.5, GLM-5 등 제공',
    logoUrl: '/images/providers/zhipu.svg',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'low',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'glm-4.5-air',
        displayName: 'GLM-4.5 Air',
        contextWindow: 8192,
        supportsVision: false,
      },
      {
        modelId: 'glm-4.5',
        displayName: 'GLM-4.5',
        contextWindow: 8192,
        supportsVision: true,
      },
      {
        modelId: 'glm-4.6',
        displayName: 'GLM-4.6',
        contextWindow: 8192,
        supportsVision: true,
      },
      {
        modelId: 'glm-4.7',
        displayName: 'GLM-4.7',
        contextWindow: 8192,
        supportsVision: true,
      },
      {
        modelId: 'glm-5',
        displayName: 'GLM-5',
        contextWindow: 8192,
        supportsVision: true,
      },
    ],
    apiKeyInstructions: 'Z.ai API 키 필요',
    apiKeyUrl: 'https://z.ai',
    helpUrl: 'https://z.ai',
    isPopular: false,
    sortOrder: 14,
  },

  // Moonshot AI (KIMI)
  {
    templateId: 'moonshot',
    name: 'Moonshot AI (KIMI)',
    providerType: 'moonshot',
    description: 'Moonshot AI의 Kimi 모델 시리즈. Kimi K2.5, Kimi Latest 등 제공',
    logoUrl: '/images/providers/moonshot.svg',
    defaultBaseUrl: 'https://api.moonshot.ai/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'low',
    defaultQualityTier: 'balanced',
    defaultModels: [
      {
        modelId: 'kimi-k2.5',
        displayName: 'Kimi K2.5',
        contextWindow: 262144,
        supportsVision: true,
      },
      {
        modelId: 'kimi-latest',
        displayName: 'Kimi Latest',
        contextWindow: 131072,
        supportsVision: true,
      },
      {
        modelId: 'moonshot-v1-128k',
        displayName: 'Moonshot 128K',
        contextWindow: 131072,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'Moonshot AI 플랫폼에서 API 키 발급',
    apiKeyUrl: 'https://platform.moonshot.ai',
    helpUrl: 'https://platform.moonshot.ai/docs',
    isPopular: false,
    sortOrder: 15,
  },

  // OpenRouter (인기 - 멀티 제공자)
  {
    templateId: 'openrouter',
    name: 'OpenRouter',
    providerType: 'openrouter',
    description: '200+ AI 모델을 단일 API로 접근. OpenAI, Anthropic, Google, Meta 등',
    logoUrl: '/images/providers/openrouter.svg',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['vision', 'function_calling', 'json_mode', 'streaming', 'tools'],
    defaultCostTier: 'medium',
    defaultQualityTier: 'premium',
    defaultModels: [
      {
        modelId: 'openai/gpt-4o',
        displayName: 'GPT-4o (via OpenRouter)',
        contextWindow: 128000,
        supportsVision: true,
      },
      {
        modelId: 'openai/gpt-4o-mini',
        displayName: 'GPT-4o Mini (via OpenRouter)',
        contextWindow: 128000,
        supportsVision: true,
      },
      {
        modelId: 'anthropic/claude-sonnet-4-5',
        displayName: 'Claude Sonnet 4.5 (via OpenRouter)',
        contextWindow: 200000,
        supportsVision: true,
      },
      {
        modelId: 'anthropic/claude-3-5-haiku',
        displayName: 'Claude 3.5 Haiku (via OpenRouter)',
        contextWindow: 200000,
        supportsVision: false,
      },
      {
        modelId: 'google/gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash (via OpenRouter)',
        contextWindow: 1000000,
        supportsVision: true,
      },
      {
        modelId: 'google/gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash (via OpenRouter)',
        contextWindow: 1048576,
        supportsVision: true,
      },
      {
        modelId: 'meta-llama/llama-3.3-70b-instruct',
        displayName: 'Llama 3.3 70B (via OpenRouter)',
        contextWindow: 131072,
        supportsVision: false,
      },
      {
        modelId: 'deepseek/deepseek-chat-v3',
        displayName: 'DeepSeek V3 (via OpenRouter)',
        contextWindow: 131072,
        supportsVision: false,
      },
      {
        modelId: 'mistralai/mistral-large',
        displayName: 'Mistral Large (via OpenRouter)',
        contextWindow: 128000,
        supportsVision: false,
      },
      {
        modelId: 'qwen/qwen-2.5-72b-instruct',
        displayName: 'Qwen 2.5 72B (via OpenRouter)',
        contextWindow: 131072,
        supportsVision: false,
      },
    ],
    apiKeyInstructions: 'OpenRouter 대시보드에서 API 키를 생성하세요. Settings → Keys → Create Key',
    apiKeyUrl: 'https://openrouter.ai/keys',
    helpUrl: 'https://openrouter.ai/docs',
    isPopular: true,
    sortOrder: 5,
  },

  // Custom (직접 설정 - 범용 OpenAI 호환)
  {
    templateId: 'custom',
    name: '직접 설정 (OpenAI 호환)',
    providerType: 'custom',
    description: 'OpenAI API 호환 형식을 사용하는 커스텀 제공자. Azure, Together, Fireworks 등 지원',
    logoUrl: '/images/providers/custom.svg',
    defaultAuthType: 'api_key',
    defaultCapabilities: ['streaming'],
    defaultCostTier: 'low',
    defaultQualityTier: 'balanced',
    defaultModels: [],
    apiKeyInstructions: '사용하려는 제공자의 API 키를 입력하세요. 기본 URL도 함께 설정해야 합니다.',
    apiKeyUrl: '',
    helpUrl: '',
    isPopular: false,
    sortOrder: 99,
  },
];

/**
 * 모든 제공자 템플릿을 반환합니다.
 */
export function getProviderTemplates(): any[] {
  return [...providerTemplates].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 특정 템플릿을 ID로 조회합니다.
 */
export function getProviderTemplate(templateId: string): any {
  return providerTemplates.find((t) => t.templateId === templateId);
}

/**
 * 인기 제공자 템플릿만 반환합니다.
 */
export function getPopularTemplates(): any[] {
  return providerTemplates
    .filter((t) => t.isPopular)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 템플릿 ID로 템플릿이 존재하는지 확인합니다.
 */
export function hasProviderTemplate(templateId: string): boolean {
  return providerTemplates.some((t) => t.templateId === templateId);
}
