import { z } from "zod";

const validate30MinuteSlot = (dateString: string): boolean => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const minutes = date.getMinutes();
  return minutes === 0 || minutes === 30;
};

export const createReservationSchema = z.object({
  scheduledAt: z
    .string()
    .min(1, "예약 일시를 입력해주세요")
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: "올바른 날짜 형식이 아닙니다",
    })
    .refine(validate30MinuteSlot, {
      message: "예약 시간은 30분 단위로 선택해주세요 (00분 또는 30분)",
    }),
  studentId: z.string().min(1, "학생을 선택해주세요"),
  parentId: z.string().min(1, "학부모를 선택해주세요"),
  topic: z
    .string()
    .min(2, "상담 주제는 2자 이상 입력해주세요")
    .max(200, "상담 주제는 200자 이하여야 합니다"),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const reservationUpdateSchema = z.object({
  reservationId: z.string().min(1, "예약 ID가 필요합니다"),
  scheduledAt: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(new Date(val).getTime()), {
      message: "올바른 날짜 형식이 아닙니다",
    })
    .refine((val) => !val || validate30MinuteSlot(val), {
      message: "예약 시간은 30분 단위로 선택해주세요 (00분 또는 30분)",
    }),
  studentId: z.string().optional(),
  parentId: z.string().optional(),
  topic: z
    .string()
    .min(2, "상담 주제는 2자 이상 입력해주세요")
    .max(200, "상담 주제는 200자 이하여야 합니다")
    .optional(),
});

export type UpdateReservationInput = z.infer<typeof reservationUpdateSchema>;

export const reservationDeleteSchema = z.object({
  reservationId: z.string().min(1, "예약 ID가 필요합니다"),
});

export type DeleteReservationInput = z.infer<typeof reservationDeleteSchema>;

export const statusTransitionSchema = z.object({
  reservationId: z.string().min(1, "예약 ID를 입력해주세요"),
  newStatus: z.enum(["COMPLETED", "CANCELLED", "NO_SHOW"], {
    message: "유효하지 않은 상태입니다",
  }),
});

export const completeReservationSchema = z.object({
  reservationId: z.string().min(1, "예약 ID를 입력해주세요"),
  summary: z.string().optional(),
});

export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
export type CompleteReservationInput = z.infer<
  typeof completeReservationSchema
>;
