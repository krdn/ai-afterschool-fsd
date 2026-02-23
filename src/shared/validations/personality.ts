import { z } from "zod";

export const LearningStrategySchema = z.object({
  coreTraits: z.string().min(50).max(500),
  learningStyle: z.object({
    type: z.enum(["시각", "청각", "운동", "혼합"]),
    description: z.string(),
    focusMethod: z.string(),
  }),
  subjectStrategies: z.object({
    korean: z.string(),
    math: z.string(),
    english: z.string(),
    science: z.string(),
    social: z.string(),
  }),
  efficiencyTips: z.array(z.string()).min(3).max(7),
  motivationApproach: z.string(),
});

export const CareerGuidanceSchema = z.object({
  coreTraits: z.string().min(50).max(500),
  suitableMajors: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
        matchScore: z.number().min(1).max(100),
      })
    )
    .min(3)
    .max(10),
  careerPaths: z
    .array(
      z.object({
        field: z.string(),
        roles: z.array(z.string()),
        reasoning: z.string(),
      })
    )
    .min(3)
    .max(7),
  developmentSuggestions: z.array(z.string()).min(3).max(7),
});
