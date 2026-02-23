import { z } from "zod";

export const IssueSchema = z.object({
  title: z
    .string()
    .min(3, "제목은 3자 이상이어야 해요")
    .max(200, "제목은 200자 이내여야 해요"),
  description: z
    .string()
    .max(5000, "설명은 5000자 이내여야 해요")
    .optional()
    .or(z.literal("")),
  category: z.enum(
    [
      "BUG",
      "FEATURE",
      "IMPROVEMENT",
      "UI_UX",
      "DOCUMENTATION",
      "PERFORMANCE",
      "SECURITY",
    ],
    { message: "카테고리를 선택해 주세요" }
  ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export type IssueFormState = {
  errors?: {
    title?: string[];
    description?: string[];
    category?: string[];
    priority?: string[];
    _form?: string[];
  };
  message?: string;
  success?: boolean;
  issueId?: string;
};
