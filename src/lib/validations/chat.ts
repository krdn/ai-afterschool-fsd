import { z } from "zod"

export const ChatRequestSchema = z.object({
  prompt: z.string().min(1, "메시지를 입력하세요").max(10000),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  sessionId: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
  mentions: z.array(z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional(),
  }).passthrough()).optional(),
})

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>
