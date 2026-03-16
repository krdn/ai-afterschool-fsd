/**
 * 프롬프트 자동 최적화 루프 (Ollama + Zhipu GLM-5)
 *
 * 사용법:
 *   ZHIPU_API_KEY=... npx tsx scripts/prompt-optimizer/run.ts --type=strength --rounds=20
 *   ZHIPU_API_KEY=... npx tsx scripts/prompt-optimizer/run.ts --type=gap --rounds=20
 *   ZHIPU_API_KEY=... npx tsx scripts/prompt-optimizer/run.ts --type=plan --rounds=20
 *   ZHIPU_API_KEY=... npx tsx scripts/prompt-optimizer/run.ts --type=coaching --rounds=20
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  STRENGTH_WEAKNESS_CASES,
  GOAL_GAP_CASES,
  STUDY_PLAN_CASES,
  COACHING_CASES,
  type TestCase,
} from './test-cases';
import { judgeResponse, type JudgeResult } from './judge';
import { mutatePrompt } from './mutator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// CLI 파라미터
// ---------------------------------------------------------------------------

const PROMPT_TYPE = process.argv.find((a) => a.startsWith('--type='))?.split('=')[1] ?? 'strength';
const MAX_ROUNDS = parseInt(process.argv.find((a) => a.startsWith('--rounds='))?.split('=')[1] ?? '10');

// ---------------------------------------------------------------------------
// 프롬프트 타입별 설정
// ---------------------------------------------------------------------------

type PromptConfig = {
  name: string;
  cases: TestCase[];
  initialPrompt: string;
};

const CONFIGS: Record<string, PromptConfig> = {
  strength: {
    name: '강점/약점 분석',
    cases: STRENGTH_WEAKNESS_CASES,
    initialPrompt: `이 학생의 과목별 성적 분석 결과를 바탕으로 강점/약점 분석을 JSON으로 작성해주세요.

{{DATA}}

분석 시 다음 사항을 반드시 지켜주세요:
1. 강점 이유는 구체적으로 작성하세요 (예: "문과 과목에서 3회 연속 점수가 상승" — 동어반복 금지).
2. 약점의 향상 팁은 실행 가능한 수준으로 구체적이어야 합니다.
3. 종합 분석은 학생의 전체적인 학습 패턴과 주요 개선 방향을 포함하세요.
4. 약점 분석에서는 데이터에 없는 특정 단원을 언급하지 않도록 하세요.
5. 강점과 약점 분석 모두에서 VARK 학습 스타일과 관련된 구체적인 조언을 포함하세요.

아래 JSON 형식으로만 응답해주세요:
{
  "strengths": [{"subject": "과목명", "reason": "강점 이유 (구체적 근거 포함)", "score": 평균점수}],
  "weaknesses": [{"subject": "과목명", "reason": "약점 이유 (구체적 근거 포함)", "score": 평균점수, "improvementTip": "실행 가능한 구체적 향상 팁"}],
  "summary": "종합 분석 3~5문장 (학습 패턴, 주요 개선점, 권장 학습 방향 포함)"
}`,
  },

  gap: {
    name: '목표 격차 분석',
    cases: GOAL_GAP_CASES,
    initialPrompt: `이 학생의 과목별 현재 성적과 목표를 분석하여 목표 격차(Goal Gap) 분석을 JSON으로 작성해주세요.

{{DATA}}

분석 시 다음 사항을 반드시 지켜주세요:
1. 달성 전략은 구체적이고 실행 가능해야 합니다 (기간, 방법, 분량 포함)
2. 추세(상승/하락)를 고려하여 달성 가능성을 현실적으로 평가하세요
3. 종합 조언은 우선순위가 명확해야 합니다 (어떤 과목부터 집중할지)

아래 JSON 형식으로만 응답해주세요:
{
  "gaps": [
    {
      "subject": "과목명",
      "currentScore": 현재평균점수,
      "targetScore": 목표점수,
      "gap": 격차(targetScore - currentScore),
      "achievability": "HIGH" | "MEDIUM" | "LOW",
      "strategy": "구체적인 달성 전략 1~2문장 (기간, 방법, 분량 포함)"
    }
  ],
  "overallAchievability": 0~100 사이의 전체 달성 가능성 퍼센트,
  "advice": "종합 조언 3~5문장 (우선순위 과목, 시간 배분, 핵심 전략)"
}

achievability 기준:
- HIGH: 격차 10점 이하 또는 상승 추세
- MEDIUM: 격차 10~20점
- LOW: 격차 20점 초과 또는 하락 추세`,
  },

  plan: {
    name: '주간 학습 플랜',
    cases: STUDY_PLAN_CASES,
    initialPrompt: `이 학생의 강점/약점 분석과 학습스타일을 바탕으로 맞춤형 주간 학습 플랜을 JSON으로 작성해주세요.

{{DATA}}

학습 플랜 작성 규칙:
1. 약점 과목에 더 많은 시간을 배정하세요
2. 강점 과목은 유지/심화 수준으로 배정하세요
3. VARK 학습스타일을 반영한 구체적 학습 방법을 focus에 포함하세요
4. 월~일(7일) 플랜을 작성하세요
5. 하루 총 학습 시간은 3~5시간 내외로 설정하세요
6. focus에는 "교과서 3단원 복습" 같은 구체적 활동을 적으세요 ("공부하기" 같은 모호한 표현 금지)

아래 JSON 형식으로만 응답해주세요:
{
  "weeklyPlan": [
    {
      "day": "월요일",
      "subjects": [
        { "name": "과목명", "hours": 학습시간, "focus": "구체적 학습 포인트 (교재/단원/방법 명시)" }
      ]
    }
  ],
  "prioritySubjects": ["우선순위 과목1", "우선순위 과목2"],
  "rationale": "이 학습 플랜의 근거와 기대 효과 3~5문장"
}`,
  },

  coaching: {
    name: '종합 코칭 리포트',
    cases: COACHING_CASES,
    initialPrompt: `아래 3가지 분석 결과를 종합하여 코칭 리포트를 작성해주세요.

{{DATA}}

작성 규칙:
1. 동기부여 메시지는 학생의 MBTI/VARK 특성을 반영하여 개인화하세요
2. 학생의 구체적인 성적 데이터를 인용하며 격려하세요 (예: "수학이 45점에서 72점으로 올랐어요!")
3. 종합 추천은 실행 가능한 구체적 행동 계획을 포함하세요
4. 부정적이거나 비난하는 톤은 절대 사용하지 마세요

위 분석을 종합하여 아래 JSON 형식으로만 응답해주세요:
{
  "motivationMessage": "학생의 MBTI/VARK 특성을 반영한 개인화 동기부여 메시지 (3~5문장, 따뜻하고 격려하는 톤, 구체적 성적 변화 인용)",
  "overallRecommendation": "3가지 분석을 종합한 학습 전략 추천 (5~8문장, 구체적인 실행 방안 포함)"
}`,
  },
};

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------

const OLLAMA_URL = process.env.OLLAMA_DIRECT_URL || 'http://192.168.0.5:11434/api';
const GENERATION_MODEL = 'qwen2.5:7b';

const SYSTEM_PROMPT = `당신은 한국 교육 전문가이자 학습 코칭 전문가입니다.
학생의 성적 데이터, 학습 스타일(MBTI, VARK), 성격 분석을 종합하여
구체적이고 실행 가능한 학습 조언을 제공합니다.
반드시 한국어로 답변하세요.`;

async function ollamaGenerate(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GENERATION_MODEL,
      system: SYSTEM_PROMPT,
      prompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { response: string };
  return data.response;
}

// ---------------------------------------------------------------------------
// 유틸리티
// ---------------------------------------------------------------------------

const RESULTS_DIR = path.join(__dirname, 'results');

function renderTemplate(template: string, data: string): string {
  return template.replace('{{DATA}}', data);
}

async function generateWithTemplate(template: string, testCase: TestCase): Promise<string> {
  return ollamaGenerate(renderTemplate(template, testCase.dynamicData));
}

async function evaluatePrompt(template: string, cases: TestCase[]): Promise<{
  avgScore: number;
  scores: JudgeResult[];
  feedbacks: string[];
}> {
  const scores: JudgeResult[] = [];
  const feedbacks: string[] = [];

  for (const testCase of cases) {
    const output = await generateWithTemplate(template, testCase);
    const score = await judgeResponse(testCase, output);
    scores.push(score);
    if (score.feedback) feedbacks.push(`[${testCase.id}] ${score.feedback}`);
    process.stdout.write(`  ${testCase.id}: ${score.total}/100 `);
  }
  console.log();

  const avgScore = Math.round(
    scores.reduce((sum, s) => sum + s.total, 0) / scores.length * 10
  ) / 10;

  return { avgScore, scores, feedbacks };
}

function appendToLog(file: string, round: number, avgScore: number, status: string, description: string, scores: JudgeResult[]): void {
  const detail = scores.map((s) => `${s.total}`).join('/');
  fs.appendFileSync(file, `${round}\t${avgScore}\t${detail}\t${status}\t${description}\n`);
}

// ---------------------------------------------------------------------------
// 메인 루프
// ---------------------------------------------------------------------------

async function main() {
  const config = CONFIGS[PROMPT_TYPE];
  if (!config) {
    console.error(`알 수 없는 타입: ${PROMPT_TYPE}. 사용 가능: ${Object.keys(CONFIGS).join(', ')}`);
    process.exit(1);
  }

  const logFile = path.join(RESULTS_DIR, `${PROMPT_TYPE}-log.tsv`);
  const bestFile = path.join(RESULTS_DIR, `${PROMPT_TYPE}-best.txt`);

  console.log('========================================');
  console.log(` 프롬프트 최적화: ${config.name}`);
  console.log(`  생성: ${GENERATION_MODEL} (Ollama) / Judge: GLM-5 (Zhipu)`);
  console.log(`  테스트 케이스: ${config.cases.length}개`);
  console.log(`  최대 라운드: ${MAX_ROUNDS}`);
  console.log('========================================\n');

  try {
    const check = await fetch(`${OLLAMA_URL}/tags`);
    if (!check.ok) throw new Error(`status ${check.status}`);
    console.log('Ollama 연결 ✅\n');
  } catch (e) {
    console.error(`Ollama 연결 실패:`, e);
    process.exit(1);
  }

  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(logFile, 'round\tavg_score\tdetail_scores\tstatus\tdescription\n');

  let bestPrompt = config.initialPrompt;
  let bestScore = 0;
  let experimentHistory = '';
  let recentFeedbacks: string[] = [];

  // 베이스라인
  console.log('[Round 0] 베이스라인 평가 중...');
  const baseline = await evaluatePrompt(bestPrompt, config.cases);
  bestScore = baseline.avgScore;
  recentFeedbacks = baseline.feedbacks;
  appendToLog(logFile, 0, baseline.avgScore, 'baseline', 'initial prompt', baseline.scores);
  console.log(`  → 베이스라인: ${baseline.avgScore}/100\n`);
  fs.writeFileSync(bestFile, bestPrompt);

  // 실험 루프
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`[Round ${round}/${MAX_ROUNDS}] 변형 생성 중...`);

    const mutated = await mutatePrompt(bestPrompt, recentFeedbacks, experimentHistory);

    if (!mutated.includes('{{DATA}}')) {
      console.log('  ⚠ {{DATA}} 누락 — skip\n');
      appendToLog(logFile, round, 0, 'discard', 'missing placeholder', []);
      experimentHistory += `Round ${round}: SKIP\n`;
      continue;
    }

    console.log('  평가 중...');
    let evaluation;
    try {
      evaluation = await evaluatePrompt(mutated, config.cases);
    } catch (error) {
      console.log(`  ⚠ 평가 실패\n`);
      appendToLog(logFile, round, 0, 'discard', 'error', []);
      experimentHistory += `Round ${round}: ERROR\n`;
      continue;
    }

    const diff = evaluation.avgScore - bestScore;
    const status = diff > 0 ? 'keep' : 'discard';
    appendToLog(logFile, round, evaluation.avgScore, status, `${evaluation.avgScore} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)})`, evaluation.scores);

    if (status === 'keep') {
      console.log(`  ✅ KEEP: ${evaluation.avgScore}/100 (+${diff.toFixed(1)})\n`);
      bestPrompt = mutated;
      bestScore = evaluation.avgScore;
      recentFeedbacks = evaluation.feedbacks;
      fs.writeFileSync(bestFile, bestPrompt);
    } else {
      console.log(`  ❌ DISCARD: ${evaluation.avgScore}/100 (${diff.toFixed(1)}) — best ${bestScore}\n`);
      recentFeedbacks = evaluation.feedbacks;
    }

    experimentHistory += `Round ${round}: ${evaluation.avgScore} → ${status}\n`;
  }

  console.log('========================================');
  console.log(` ${config.name} 최적화 완료`);
  console.log(`  best: ${bestScore}/100`);
  console.log(`  프롬프트: ${bestFile}`);
  console.log(`  로그: ${logFile}`);
  console.log('========================================');
}

main().catch((error) => {
  console.error('실패:', error);
  process.exit(1);
});
