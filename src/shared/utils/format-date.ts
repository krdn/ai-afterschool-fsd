import { format, isValid } from "date-fns";

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷팅
 */
export function formatDate(date?: Date | string | null): string {
  const targetDate = date ? new Date(date) : new Date();

  if (!isValid(targetDate)) {
    throw new Error("Invalid date input provided");
  }

  return format(targetDate, "yyyy-MM-dd");
}
