/**
 * 변경 내용 포맷팅 유틸리티
 * AuditLog의 changes 필드를 가독성 있게 표시합니다.
 */

export function formatChangesForDiff(
  changes: Record<string, unknown> | null
): string {
  if (!changes || Object.keys(changes).length === 0) {
    return "변경 내용이 없습니다.";
  }

  try {
    return Object.entries(changes)
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          const { before, after } = value as {
            before?: unknown;
            after?: unknown;
          };

          if (before !== undefined && after !== undefined) {
            const beforeStr =
              typeof before === "string" ? before : JSON.stringify(before);
            const afterStr =
              typeof after === "string" ? after : JSON.stringify(after);
            return `${key}:\n  이전: ${beforeStr}\n  변경: ${afterStr}`;
          }

          if (before !== undefined) {
            const beforeStr =
              typeof before === "string" ? before : JSON.stringify(before);
            return `${key}: ${beforeStr} (삭제됨)`;
          }

          if (after !== undefined) {
            const afterStr =
              typeof after === "string" ? after : JSON.stringify(after);
            return `${key}: ${afterStr} (추가됨)`;
          }
        }

        const valueStr =
          typeof value === "string" ? value : JSON.stringify(value);
        return `${key}: ${valueStr}`;
      })
      .join("\n\n");
  } catch {
    return JSON.stringify(changes, null, 2);
  }
}

/**
 * 변경 내용을 요약 문자열로 변환 (테이블 셀용)
 */
export function formatChangesSummary(
  changes: Record<string, unknown> | null,
  maxLength: number = 100
): string {
  if (!changes) return "-";

  try {
    const formatted = Object.entries(changes)
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          const { before, after } = value as {
            before?: unknown;
            after?: unknown;
          };
          if (before !== undefined && after !== undefined) {
            return `${key}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`;
          }
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join(", ");

    return formatted.length > maxLength
      ? formatted.slice(0, maxLength) + "..."
      : formatted;
  } catch {
    return JSON.stringify(changes).slice(0, maxLength);
  }
}
