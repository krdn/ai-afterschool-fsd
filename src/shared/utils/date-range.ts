import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { DatePreset, DateRange } from "../types/statistics";

export type ExtendedDatePreset =
  | DatePreset
  | "TODAY"
  | "7D"
  | "30D"
  | "ALL";

/**
 * 날짜 프리셋을 날짜 범위로 변환
 */
export function getDateRangeFromPreset(preset: ExtendedDatePreset): DateRange {
  const now = new Date();

  switch (preset) {
    case "TODAY":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7D":
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case "30D":
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "ALL":
      return { start: new Date(2020, 0, 1), end: endOfDay(now) };
    case "1M":
    case "3M":
    case "6M":
    case "1Y": {
      const monthsMap: Record<DatePreset, number> = {
        "1M": 1,
        "3M": 3,
        "6M": 6,
        "1Y": 12,
      };
      const months = monthsMap[preset];
      const startDate = startOfMonth(subMonths(now, months - 1));
      const endDate = endOfMonth(now);
      return { start: startDate, end: endDate };
    }
    default:
      return {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now),
      };
  }
}

export const PRESET_LABELS: Record<ExtendedDatePreset, string> = {
  TODAY: "오늘",
  "7D": "최근 7일",
  "30D": "최근 30일",
  "1M": "최근 1개월",
  "3M": "최근 3개월",
  "6M": "최근 6개월",
  "1Y": "최근 1년",
  ALL: "전체",
};

export const DEFAULT_PRESETS: ExtendedDatePreset[] = [
  "TODAY",
  "7D",
  "30D",
  "3M",
  "ALL",
];
