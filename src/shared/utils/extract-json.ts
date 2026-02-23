/**
 * LLM 텍스트 응답에서 JSON 객체를 추출하여 파싱합니다.
 *
 * 마크다운 코드블록(```json ... ```)이나 앞뒤 설명 텍스트가 포함된
 * LLM 응답에서 JSON을 안전하게 추출합니다.
 */
export function extractJsonFromLLM(text: string): unknown {
  const trimmed = text.trim();

  // 1단계: 그대로 파싱 시도
  try {
    return JSON.parse(trimmed);
  } catch {
    // 순수 JSON이 아니면 다음 단계로
  }

  // 2단계: 마크다운 코드블록 제거
  const codeBlockMatch = trimmed.match(
    /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/
  );
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 다음 단계로
    }
  }

  // 3단계: 텍스트에서 첫 번째 JSON 객체({...}) 추출
  const startIdx = trimmed.indexOf("{");
  if (startIdx !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < trimmed.length; i++) {
      const ch = trimmed[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(startIdx, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error(
    `LLM 응답에서 유효한 JSON을 추출할 수 없습니다: ${trimmed.slice(0, 100)}...`
  );
}
