import type { TestCase } from './test-cases';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const JUDGE_MODEL = 'glm-5';

export type JudgeResult = {
  accuracy: number;
  specificity: number;
  educationalValue: number;
  readability: number;
  total: number;
  feedback: string;
};

async function zhipuGenerate(prompt: string): Promise<string> {
  if (!ZHIPU_API_KEY) throw new Error('ZHIPU_API_KEY 환경 변수가 설정되지 않았습니다');

  const res = await fetch(ZHIPU_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Zhipu API error: ${res.status} ${errText}`);
  }

  const data = await res.json() as {
    choices: Array<{
      message: {
        content: string;
        reasoning_content?: string;
      };
    }>;
  };

  const msg = data.choices[0]?.message;
  // GLM-5는 reasoning model: content에 최종 답변, reasoning_content에 추론 과정
  const content = msg?.content || '';
  const reasoning = msg?.reasoning_content || '';

  // content에서 JSON 추출 시도 → reasoning에서 시도
  // 둘 다 합쳐서 반환 (파싱 로직에서 JSON을 추출함)
  return content ? content : reasoning;
}

export async function judgeResponse(
  testCase: TestCase,
  llmOutput: string,
): Promise<JudgeResult> {
  const judgePrompt = `당신은 한국 교육 AI 시스템의 품질 평가 전문가입니다.
아래 학생 데이터에 대한 AI 분석 결과를 채점해주세요.

## 학생 데이터
${testCase.dynamicData}

## 이 케이스에서 기대하는 핵심 포인트
${testCase.expectedPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## AI가 생성한 분석 결과
${llmOutput}

## 채점 기준
1. accuracy (0-30): 통계 데이터와 분석이 일치하는가? 강점/약점 분류가 데이터에 부합하는가?
2. specificity (0-25): 구체적이고 실행 가능한 조언인가? ("열심히 하세요" → 0점)
3. educationalValue (0-25): 교사가 실제 학생 지도에 활용할 수 있는가? 기대 핵심 포인트를 반영했는가?
4. readability (0-20): JSON 형식이 올바르고 적절한 길이인가?

반드시 아래 JSON 형식으로만 답변하세요. 설명 없이 JSON만 출력:
{"accuracy": 점수, "specificity": 점수, "educationalValue": 점수, "readability": 점수, "total": 총점, "feedback": "개선 포인트 1문장"}`;

  let text: string;
  try {
    text = await zhipuGenerate(judgePrompt);
  } catch (error) {
    console.error(`  Judge API 에러: ${error}`);
    return { accuracy: 15, specificity: 12, educationalValue: 12, readability: 10, total: 49, feedback: 'Judge API 에러' };
  }

  const jsonMatch = text.match(/\{[^{}]*"accuracy"[^{}]*\}/);
  if (!jsonMatch) {
    // reasoning_content에서 JSON 추출 재시도
    const broadMatch = text.match(/\{[\s\S]*?\}/);
    if (broadMatch) {
      try {
        const parsed = JSON.parse(broadMatch[0]) as JudgeResult;
        if (parsed.accuracy !== undefined) {
          if (!parsed.total) parsed.total = (parsed.accuracy || 0) + (parsed.specificity || 0) + (parsed.educationalValue || 0) + (parsed.readability || 0);
          return parsed;
        }
      } catch { /* fall through */ }
    }
    console.error(`  Judge 파싱 실패 (응답 길이: ${text.length})`);
    return { accuracy: 15, specificity: 12, educationalValue: 12, readability: 10, total: 49, feedback: 'Judge 파싱 실패' };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as JudgeResult;
    if (!parsed.total) parsed.total = (parsed.accuracy || 0) + (parsed.specificity || 0) + (parsed.educationalValue || 0) + (parsed.readability || 0);
    return parsed;
  } catch {
    return { accuracy: 15, specificity: 12, educationalValue: 12, readability: 10, total: 49, feedback: 'Judge JSON 파싱 실패' };
  }
}
