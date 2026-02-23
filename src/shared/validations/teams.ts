import { z } from "zod";

export const TeamSchema = z.object({
  name: z
    .string()
    .min(1, "팀 이름을 입력해주세요")
    .max(50, "팀 이름은 50자 이내로 입력해주세요"),
});

export type TeamInput = z.infer<typeof TeamSchema>;

export type TeamFormState = {
  errors?: {
    name?: string[];
    _form?: string[];
  };
  message?: string;
};
