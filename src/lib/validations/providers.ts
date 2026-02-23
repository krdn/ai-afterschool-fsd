import { z } from "zod"

export const CreateProviderSchema = z.object({
  templateId: z.string().optional(),
  name: z.string().min(1, "제공자 이름은 필수입니다").max(100).optional(),
  providerType: z.string().min(1).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url("유효한 URL을 입력하세요").optional().or(z.literal("")),
  authType: z.enum(["api_key", "bearer", "custom", "none"]).optional(),
  customAuthHeader: z.string().max(100).optional(),
  capabilities: z.array(z.enum(["vision", "function_calling", "json_mode", "streaming", "tools"])).optional(),
  costTier: z.enum(["free", "low", "medium", "high"]).optional(),
  qualityTier: z.enum(["fast", "balanced", "premium"]).optional(),
  isEnabled: z.boolean().optional(),
})

export type CreateProviderInput = z.infer<typeof CreateProviderSchema>
