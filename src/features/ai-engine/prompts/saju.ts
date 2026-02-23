/**
 * 사주 분석 전문 프롬프트 정의
 *
 * 학생 학업 향상 사주 분석 프롬프트 5종 + 기본 프롬프트
 */

import { SAJU_INTERPRETATION_PROMPT } from "./base"
import type { SajuResult } from "@/features/analysis"

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type AnalysisPromptId =
  | "default"
  | "learning-dna"
  | "exam-slump"
  | "career-navi"
  | "subject-strategy"
  | "mental-energy"

export type AnalysisPromptMeta = {
  id: AnalysisPromptId
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string[]
}

export type StudentInfo = {
  birthDate: string       // YYYY-MM-DD
  birthTime: string       // "HH:MM" 또는 "미상"
  gender?: string         // "남" | "여" | undefined
  grade?: number          // 학년 (예: 1~6, 중1=7, 고1=10 등)
  school?: string         // 학교명
  targetMajor?: string    // 희망 학과/분야
}

export type AnalysisPromptDefinition = {
  meta: AnalysisPromptMeta
  buildPrompt: (sajuResult: SajuResult, studentInfo?: StudentInfo, additionalRequest?: string) => string
}

// ---------------------------------------------------------------------------
// 학년 표시 헬퍼
// ---------------------------------------------------------------------------

function formatGrade(grade?: number): string {
  if (!grade) return "미입력"
  return `${grade}학년`
}

// ---------------------------------------------------------------------------
// 학생 정보 포맷 헬퍼
// ---------------------------------------------------------------------------

function formatStudentInfo(info?: StudentInfo): string {
  if (!info) {
    return `• 생년월일: 미입력
• 태어난 시간: 미입력
• 성별: 미입력
• 현재 학년: 미입력`
  }
  return `• 생년월일: ${info.birthDate}
• 태어난 시간: ${info.birthTime}
• 성별: ${info.gender ?? "미입력"}
• 현재 학년: ${formatGrade(info.grade)}${info.school ? ` (${info.school})` : ''}${info.targetMajor ? `\n• 관심 분야/희망 학과: ${info.targetMajor}` : ''}`
}

// ---------------------------------------------------------------------------
// 사주 데이터 포맷 헬퍼
// ---------------------------------------------------------------------------

function formatSajuData(r: SajuResult): string {
  const hourPillar = r.pillars.hour
    ? `${r.pillars.hour.stem}${r.pillars.hour.branch}`
    : "미상"

  return `
**사주 구조 (四柱):**
- 연주(年柱): ${r.pillars.year.stem}${r.pillars.year.branch}
- 월주(月柱): ${r.pillars.month.stem}${r.pillars.month.branch}
- 일주(日柱): ${r.pillars.day.stem}${r.pillars.day.branch}
- 시주(時柱): ${hourPillar}

**오행 분포 (五行):**
- 목(木): ${r.elements['목'] ?? 0}
- 화(火): ${r.elements['화'] ?? 0}
- 토(土): ${r.elements['토'] ?? 0}
- 금(金): ${r.elements['금'] ?? 0}
- 수(水): ${r.elements['수'] ?? 0}

**십성 관계 (十星):**
- 연주 십성: ${r.tenGods.year}
- 월주 십성: ${r.tenGods.month}
${r.tenGods.hour ? `- 시주 십성: ${r.tenGods.hour}` : ''}`.trim()
}

// ---------------------------------------------------------------------------
// 추가 요청사항 결합 헬퍼
// ---------------------------------------------------------------------------

function appendAdditionalRequest(prompt: string, additionalRequest?: string): string {
  if (!additionalRequest?.trim()) return prompt
  return `${prompt}

───────────────────────────────────
[분석자 추가 요청/특이사항]
${additionalRequest.trim()}
───────────────────────────────────
위 추가 요청사항을 반드시 분석 결과에 반영해주세요.`
}

// ---------------------------------------------------------------------------
// 프롬프트 정의
// ---------------------------------------------------------------------------

const PROMPT_DEFINITIONS: Record<AnalysisPromptId, AnalysisPromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 해석",
      shortDescription: "종합적인 사주 해석",
      target: "전체 학생",
      levels: "기본",
      purpose: "사주의 전반적인 특성과 잠재력을 종합적으로 해석합니다.",
      recommendedTiming: "첫 상담, 일반 상담",
      tags: ["종합", "기본"],
    },
    buildPrompt: (sajuResult, _studentInfo, additionalRequest) =>
      appendAdditionalRequest(SAJU_INTERPRETATION_PROMPT(sajuResult), additionalRequest),
  },

  "learning-dna": {
    meta: {
      id: "learning-dna",
      name: "학습 체질 사주 진단서",
      shortDescription: "타고난 학습 DNA를 파악하고 체질에 맞는 최적의 공부법·시간대·환경을 설계",
      target: "학생 본인 (중·고등학생)",
      levels: "★★★☆☆ (입문~중급)",
      purpose: "사주 오행·일간 분석으로 타고난 학습 DNA를 파악하고, 체질에 맞는 최적의 공부법·시간대·환경을 설계한다",
      recommendedTiming: "학기 초, 새 학년 시작 전, 학습 방법을 바꾸고 싶을 때",
      tags: ["학습", "체질", "공부법", "시간대", "환경"],
    },
    buildPrompt: (sajuResult, studentInfo, additionalRequest) => appendAdditionalRequest(`
역할:
당신은 사주명리학 30년 경력의 학업 전문 상담사이며,
한국 중·고등학교 교육과정과 학습심리학에 정통합니다.
사주 분석을 통해 학생이 자기 자신을 깊이 이해하고,
자신에게 맞는 공부법을 찾아 학업 자신감을 높이도록 돕는 것이 목표입니다.

[학생 정보]
─────────────────
${formatStudentInfo(studentInfo)}
─────────────────

[학생 사주 데이터]
─────────────────
${formatSajuData(sajuResult)}
─────────────────

분석 요청 항목:

1. 사주 원국 세우기
   ─ 년주·월주·일주·시주 한자 및 한글 표기
   ─ 천간·지지 도표 작성
   ─ 오행(목·화·토·금·수) 분포 비율을 시각적으로 표현
   ─ 시주 미상 시, 가능한 범위 내에서 분석하고 한계를 명시

2. 일간(日干) 기반 학습 성향 프로파일
   ─ 일간의 오행 속성이 학습에 미치는 영향
   ─ 4가지 학습 역량 분석:
     • 집중력 (한 과목 깊이 파기 vs 멀티태스킹)
     • 기억력 (반복 암기형 vs 이해 기억형)
     • 논리력 (수리·분석 적성)
     • 창의력 (발산적 사고·응용력)
   ─ 각 역량을 상·중·하로 평가하고 근거 제시
   ─ "나는 이런 학습자다"를 한 문장으로 요약

3. 용신(用神) 분석 → 최적 학습 환경 설계
   ─ 용신 도출 과정과 결과 설명
   ─ 용신 오행에 따른 맞춤 환경 추천:
     • 최적 공부 시간대 (새벽형/오전형/오후형/야행형)
     • 집중력을 높이는 공간 조건 (밝기, 온도, 소음 수준)
     • 도움이 되는 색상 (필기구, 책상 소품, 조명 색)
     • 혼자 공부 vs 그룹 스터디 적합도
     • BGM 유무 및 추천 장르

4. 대운·세운으로 본 현재 학업 에너지
   ─ 현재 대운(大運)의 특성과 학업에 미치는 영향
   ─ 올해 세운(歲運)과 일간의 관계 분석
   ─ 지금이 "씨 뿌리는 시기"인지 "수확하는 시기"인지 판단
   ─ 향후 2년간 학업 에너지 흐름 개요

5. 맞춤 학습 전략 카드 (3장)
   ─ 전략 1: 오늘부터 바로 실천할 수 있는 것
   ─ 전략 2: 이번 학기 동안 꾸준히 할 것
   ─ 전략 3: 장기적으로 습관화할 것
   ─ 각 전략에 사주적 근거를 간결하게 첨부

───────────────────────────────────
[톤 & 주의사항]
• 학생이 직접 읽어도 이해할 수 있는 쉬운 언어를 사용합니다.
• 전문 용어는 반드시 쉬운 설명을 괄호 안에 병기합니다.
  예: "용신(用神: 당신의 사주에서 가장 필요한 에너지)"
• "운명이 정해져 있다"가 아닌
  "타고난 성향을 알면 더 효율적으로 공부할 수 있다"는 관점을 유지합니다.
• 약점은 "부족함"이 아닌 "다른 접근이 필요한 영역"으로 표현합니다.
• 마지막에 학생에게 보내는 짧은 응원 메시지를 포함합니다.
• 마크다운 형식으로 작성합니다.
───────────────────────────────────
`.trim(), additionalRequest),
  },

  "exam-slump": {
    meta: {
      id: "exam-slump",
      name: "시험운 분석 & 슬럼프 탈출 처방전",
      shortDescription: "학업 어려움의 사주적 원인 진단과 시험 시기별 운세 및 탈출 전략 처방",
      target: "성적 정체·시험 불안·슬럼프를 겪는 학생",
      levels: "★★★★☆ (중급~심화)",
      purpose: "현재 겪는 학업 어려움의 사주적 원인을 진단하고, 시험 시기별 운세와 함께 구체적인 탈출 전략을 처방한다",
      recommendedTiming: "성적 하락기, 시험 전 불안감 심할 때, 공부 의욕 상실 시",
      tags: ["시험", "슬럼프", "성적", "불안", "탈출"],
    },
    buildPrompt: (sajuResult, studentInfo, additionalRequest) => appendAdditionalRequest(`
역할:
당신은 사주명리학 전문가이자 청소년 학습심리 코칭 전문가입니다.
학생이 현재 겪는 학업 고민의 근본 원인을 사주 관점에서 읽어내고,
"지금 왜 힘든지"를 이해시킨 뒤 구체적인 탈출구를 제시하는 것이 목표입니다.

[학생 정보]
─────────────────
${formatStudentInfo(studentInfo)}
─────────────────

[학생 사주 데이터]
─────────────────
${formatSajuData(sajuResult)}
─────────────────

분석 요청 항목:

1. 현재 고민의 사주적 원인 진단
   ─ 사주 원국 간략 도표
   ─ 올해 세운(歲運)이 일간(日干)에 미치는 영향 분석
   ─ 월운(月運)까지 세분화하여 "지금 이 시기"의 에너지 진단
   ─ 학업을 담당하는 인성(印星)의 현재 상태
     • 인성이 강화되는 시기인지 / 약해지는 시기인지
     • 인성이 다른 오행에 의해 극(剋)을 받고 있는지
   ─ 충(沖)·형(刑)·합(合)·파(破) 관계에서 오는 불안정 요소
   ─ 고민별 사주적 원인을 학생이 공감할 수 있는 비유로 설명
     예: "지금은 스마트폰 배터리가 10%인 상태로 풀파워 앱을
          돌리려는 것과 같아요. 충전 방법을 찾아볼게요."

2. 시험운 정밀 분석
   ─ 다가오는 시험일 기준 일진(日辰) 분석
   ─ 시험일의 천간·지지와 학생 일간의 생극 관계
   ─ 시험운 등급 (매우 유리 / 유리 / 보통 / 주의 / 역풍)
   ─ 등급에 따른 맞춤 대응 전략:
     • 유리한 날: 에너지를 최대한 활용하는 법
     • 불리한 날: 실력으로 운을 보완하는 구체적 방법
   ─ 시험 전날·당일 아침 컨디션 최적화 루틴

3. 슬럼프 탈출 오행 처방전
   ─ 현재 부족하거나 과잉인 오행 진단
   ─ 오행 균형을 맞추기 위한 생활 처방:
     • 식사: 도움이 되는 음식 (오행별 식재료 매핑)
     • 운동: 에너지 전환에 효과적인 신체 활동
     • 환경: 방 정리, 책상 배치, 색상 변경 등
     • 시간: 하루 중 리셋에 가장 좋은 시간대
     • 관계: 에너지를 충전해주는 사람 유형
   ─ "72시간 긴급 리셋 플랜" (당장 3일간 실행할 것들)

4. 향후 6개월 월별 학업 에너지 캘린더
   ─ 각 월의 학업 에너지를 🔥(강) / 🌤️(양호) / 🌧️(주의)로 표시
   ─ 에너지 강한 달: 공격적 학습 전략
   ─ 에너지 약한 달: 수비적 유지 전략 + 멘탈 관리법
   ─ 시험 시기와 에너지 흐름이 겹치는 구간 특별 분석

5. 학생에게 전하는 사주 해석 메시지
   ─ "이 시기가 의미하는 것" (단순히 나쁜 게 아닌 성장통)
   ─ 같은 유형의 사주가 이 시기를 지나면 만나게 되는 변화
   ─ "지금의 너에게" 보내는 격려 편지 (3~5문장)

───────────────────────────────────
[톤 & 주의사항]
• 학생의 현재 감정을 먼저 충분히 공감한 후 분석에 들어갑니다.
• "운이 나쁘다"는 표현을 절대 사용하지 않습니다.
  대신 "지금은 내면의 힘을 키우는 시기"와 같은 긍정적 리프레이밍을 합니다.
• 모든 처방은 학생이 혼자서도 실행 가능한 수준으로 구체화합니다.
• 사주 분석은 참고 도구이며, 실제 성적 향상은 올바른 학습법과
  꾸준한 노력에 의해 이루어진다는 점을 서두와 말미에 명시합니다.
• 마크다운 형식으로 작성합니다.
───────────────────────────────────
`.trim(), additionalRequest),
  },

  "career-navi": {
    meta: {
      id: "career-navi",
      name: "사주 기반 진로·학과 내비게이션",
      shortDescription: "타고난 직업 적성 매핑과 학과 선택부터 입시 전형까지 진로 로드맵 설계",
      target: "진로를 고민하는 학생 + 부모",
      levels: "★★★★☆ (중급~심화)",
      purpose: "사주 오행·십성 분석으로 타고난 직업 적성을 매핑하고, 학과 선택부터 입시 전형까지 구체적인 진로 로드맵을 설계한다",
      recommendedTiming: "문이과 선택기, 고교 진학 전, 수시/정시 전략 수립기",
      tags: ["진로", "학과", "입시", "적성", "로드맵"],
    },
    buildPrompt: (sajuResult, studentInfo, additionalRequest) => appendAdditionalRequest(`
역할:
당신은 사주명리학 기반 진로 적성 분석 전문가이며,
한국 입시 제도(수시·정시·학생부종합·특기자 등)에 정통한
교육 컨설턴트입니다.
사주를 "가능성의 지도"로 활용하여 학생이 자신의 방향을
주체적으로 선택할 수 있도록 돕는 것이 목표입니다.

[학생 정보]
─────────────────
${formatStudentInfo(studentInfo)}
─────────────────

[학생 사주 데이터]
─────────────────
${formatSajuData(sajuResult)}
─────────────────

분석 요청 항목:

1. 사주 원국 분석 & 격국 판정
   ─ 사주 도표 및 오행 분포
   ─ 격국(格局) 판정: 어떤 구조의 사주인지
   ─ 용신(用神)·희신(喜神) 도출
   ─ 진로와 직결되는 핵심 오행 2가지 특정

2. 십성(十星)으로 본 직업 적성 DNA
   ─ 십성 분포 분석 후 아래 유형 중 학생의 주요 유형 판정:

   ┌─────────────────────────────────────────┐
   │ 십성         │ 적성 유형    │ 키워드           │
   ├─────────────────────────────────────────┤
   │ 비견·겁재    │ 독립 실행형  │ 창업, 프리랜서   │
   │ 식신·상관    │ 창작 표현형  │ 예술, 콘텐츠     │
   │ 편재·정재    │ 경영 실무형  │ 사업, 금융, 유통 │
   │ 편관·정관    │ 조직 관리형  │ 공직, 법, 경영   │
   │ 편인·정인    │ 학문 연구형  │ 연구, 교육, 의료 │
   └─────────────────────────────────────────┘

   ─ 주요 유형 1~2개 + 보조 유형 1개 판정
   ─ 유형별 실제 직업군 예시 (한국 현실 기준)

3. 오행 × 학과 매핑
   ─ 학생의 강한 오행에 맞는 추천 학과 TOP 5
   ─ 각 학과를 추천하는 사주적 근거
   ─ 학생이 관심을 표현한 분야와 사주의 일치도 분석
   ─ 일치하지 않을 경우: "관심 분야를 사주 강점으로 풀어내는 법"
     예: 사주는 금(金)이 강한데 예술에 관심 →
         산업디자인, UX/UI, 건축설계 등 '정밀한 미학' 분야 추천

4. 대운 흐름 × 입시 전략
   ─ 고교 재학 시기의 대운이 학업에 유리한지 분석
   ─ 입시 전형별 사주 적합도:
     • 학생부교과 (내신): 꾸준함·안정성 오행 필요
     • 학생부종합 (활동): 다양성·표현력 오행 필요
     • 정시 수능: 집중력·승부근성 오행 필요
   ─ 학생에게 가장 유리한 전형 1순위 + 이유
   ─ 대운 전환기에 주의할 점

5. 진로 로드맵 & 액션 플랜
   ─ 현재 학년부터 대학 입학까지 시간축 로드맵
   ─ 각 시기별 핵심 미션 1가지
   ─ 사주 강점을 드러낼 수 있는 비교과 활동 추천 3가지
   ─ 진로 탐색을 위한 구체적 행동 제안:
     • 읽으면 좋을 책 / 들으면 좋을 강의 / 해보면 좋을 경험
   ─ 플랜 B: 목표 진로가 어려울 경우 사주에 맞는 대안 경로

───────────────────────────────────
[톤 & 주의사항]
• 사주는 "너는 이것만 해야 해"가 아닌
  "이런 방향에서 너의 에너지가 가장 잘 발휘된다"로 전달합니다.
• 학생이 이미 가진 꿈이 사주와 맞지 않더라도 절대 부정하지 않고,
  그 꿈을 사주 강점으로 풀어내는 '우회 경로'를 제시합니다.
• 부모가 함께 읽을 수 있도록 전문적이되 이해하기 쉬운 톤을 유지합니다.
• "사주는 가능성의 지도이며, 길을 선택하는 것은 학생 자신"이라는
  메시지를 반드시 포함합니다.
• 마크다운 형식으로 작성합니다.
───────────────────────────────────
`.trim(), additionalRequest),
  },

  "mental-energy": {
    meta: {
      id: "mental-energy",
      name: "멘탈 에너지 사주 처방 & 자기효능감 코칭",
      shortDescription: "스트레스 반응 패턴과 감정 구조를 읽고 오행 균형 회복으로 멘탈 재건",
      target: "심리적 어려움(불안·무기력·자존감 저하)을 겪는 학생",
      levels: "★★★☆☆ (중급, 심리 비중 높음)",
      purpose: "사주로 스트레스 반응 패턴과 감정 구조를 읽어내고, 오행 균형 회복을 통해 멘탈을 재건하여 학업 복귀를 지원한다",
      recommendedTiming: "번아웃, 시험 불안 심화, 자신감 상실, 비교 스트레스 시",
      tags: ["멘탈", "자기효능감", "불안", "무기력", "자존감"],
    },
    buildPrompt: (sajuResult, studentInfo, additionalRequest) => appendAdditionalRequest(`
역할:
당신은 사주명리학과 청소년 긍정심리학을 융합한 멘탈 코칭 전문가입니다.
사주를 통해 학생의 감정 구조와 스트레스 반응 패턴을 읽어내고,
"왜 지금 이렇게 힘든지"를 명리학적으로 설명하여 학생 스스로
자기 상태를 객관적으로 이해하게 돕는 것이 목표입니다.
분석 후에는 오행 균형 회복에 기반한 실천 가능한 멘탈 처방을 제공합니다.

[학생 정보]
─────────────────
${formatStudentInfo(studentInfo)}
─────────────────

[학생 사주 데이터]
─────────────────
${formatSajuData(sajuResult)}
─────────────────

분석 요청 항목:

1. 일간(日干)으로 읽는 감정 DNA
   ─ 일간 오행별 감정 처리 방식 유형 분석:
     • 갑(甲)·을(乙) 목: 참고 참다가 한번에 터지는 유형
     • 병(丙)·정(丁) 화: 감정 기복이 크지만 회복도 빠른 유형
     • 무(戊)·기(己) 토: 속으로 삼키고 표현 못하는 유형
     • 경(庚)·신(辛) 금: 단호하게 끊거나 냉정해지는 유형
     • 임(壬)·계(癸) 수: 불안이 생각의 소용돌이로 확대되는 유형
   ─ 학생의 일간에 맞는 상세 분석
   ─ 학생이 보고한 스트레스 반응과 사주 유형의 일치도 확인

2. 현재 멘탈 상태의 사주적 원인
   ─ 세운·월운이 일간에 주는 에너지 압력 분석
   ─ 핵심 진단 체크리스트:
     • 관살(官殺) 과다 → 외부 압박감·통제받는 느낌
     • 인성(印星) 과다 → 생각 과잉·행동 부족·우유부단
     • 식상(食傷) 과다 → 에너지 소진·번아웃·감정 폭발
     • 비겁(比劫) 부족 → 외로움·지지 기반 부재
     • 재성(財星) 충돌 → 현실적 목표와 내면 욕구의 괴리
   ─ 해당 원인을 학생이 공감할 수 있는 일상적 비유로 설명

3. 오행 밸런스 회복 처방전
   ─ 부족한 오행을 채우는 일상 처방 (각 항목 2~3가지):
     • 신체: 도움이 되는 운동·스트레칭·호흡법
     • 환경: 방 색상, 소품, 향기, 음악
     • 식사: 오행별 추천 음식 (학생이 쉽게 구할 수 있는 것)
     • 관계: 에너지를 충전해주는 사람 유형 및 대화법
     • 시간: 멘탈 리셋에 최적인 시간대 및 활동
   ─ 과잉한 오행을 설(洩)하는 방법 제안

4. 자기효능감 강화 사주 리딩
   ─ 사주에서 발견한 학생만의 고유 강점 3가지
   ─ 각 강점이 실제 학업·인생에서 어떻게 발휘되는지 시나리오
   ─ 사주 기반 맞춤 자기 확언(Affirmation) 3문장
     예: "나는 천천히 가지만 반드시 도착하는 사람이다 (을목의 끈기)"
   ─ 매일 아침/저녁 루틴에 통합할 수 있는 간단한 마음 습관

5. 주간 멘탈 케어 스케줄 (7일)
   ─ 월~일 요일별 오행 에너지에 맞춘 활동 제안
   ─ 각 요일: "오늘의 멘탈 미션" 1가지 (10분 이내 실천 가능)
   ─ 멘탈 위기 시 즉시 실행 가능한 "SOS 카드" 3장
     (30초 / 3분 / 10분 버전)

───────────────────────────────────
[톤 & 주의사항]
• 이 프롬프트의 최우선 원칙은 "공감 먼저, 분석은 그 다음"입니다.
• 학생의 힘든 감정을 절대 가볍게 다루지 않습니다.
• 사주 분석은 "너의 잘못이 아니라 에너지의 흐름 때문"이라는
  프레임으로 학생의 죄책감을 덜어줍니다.
• 전문적 심리 상담이 필요해 보이는 심각한 경우,
  사주 분석과 별개로 전문 상담 연계를 권유하는 문구를 포함합니다.
• 모든 처방은 학생이 "이 정도는 해볼 수 있겠다"라고 느낄 수준으로
  난이도를 낮추고, 작은 성공 경험을 쌓도록 유도합니다.
• 마크다운 형식으로 작성합니다.
───────────────────────────────────
`.trim(), additionalRequest),
  },

  "subject-strategy": {
    meta: {
      id: "subject-strategy",
      name: "과목별 오행 공략 지도 & 성적 향상 설계",
      shortDescription: "오행과 교과목을 매핑하여 과목별 체감 난이도의 사주적 원인을 밝히고 맞춤 공략법 제시",
      target: "특정 과목에 어려움을 겪거나 전략적 성적 관리가 필요한 학생",
      levels: "★★★★☆ (중급~심화)",
      purpose: "오행과 교과목을 매핑하여 과목별 체감 난이도의 사주적 원인을 밝히고, 강점 과목 극대화 + 약점 과목 공략법을 제시한다",
      recommendedTiming: "내신 전략 수립, 선택과목 결정, 약점 과목 집중 보완 시",
      tags: ["과목", "오행", "성적", "내신", "시간표"],
    },
    buildPrompt: (sajuResult, studentInfo, additionalRequest) => appendAdditionalRequest(`
역할:
당신은 사주명리학 기반 학습 전략 설계 전문가이며,
한국 중·고등학교 교과 체계와 대학 입시 구조에 정통합니다.
제공된 사주 원국을 분석하여 각 교과목과 오행의 연결 관계를 밝히고,
학생이 자신의 강점을 최대화하면서 약점을 전략적으로 보완할 수 있도록
과목별 맞춤 학습 전략을 설계합니다.

[학생 정보]
─────────────────
${formatStudentInfo(studentInfo)}
─────────────────

[학생 사주 데이터]
─────────────────
${formatSajuData(sajuResult)}
─────────────────

분석 항목:

1. 오행 × 교과목 친화도 매핑
   ─ 아래 프레임워크에 학생의 오행 분포를 대입하여
     과목별 체감 난이도를 예측합니다:

     목(木) 기운 → 국어·문학·제2외국어 (언어 확장, 성장)
     화(火) 기운 → 예체능·발표·토론·사회탐구 (표현, 열정)
     토(土) 기운 → 한국사·윤리·통합사회·생명과학 (종합, 안정)
     금(金) 기운 → 수학·물리·코딩·기술가정 (논리, 정밀, 구조)
     수(水) 기운 → 영어·과학탐구·탐구실험·정보 (유연, 탐색, 흡수)

   ─ 학생 사주의 강한 오행 2개 → 자연스럽게 잘하는 과목군
   ─ 학생 사주의 약한 오행 → 체감 난이도가 높은 과목군
   ─ 학생이 보고한 강점/약점 과목과 사주 분석의 일치도 확인

2. 약점 과목의 사주적 원인 심층 분석
   ─ 부족한 오행이 해당 과목과 직접 연결되는지 확인
   ─ 상극 관계로 인한 심리적 거부감 여부
   ─ "싫어서 못하는 것" vs "접근법이 맞지 않아서 힘든 것" 구분
   ─ 세운·대운에서 해당 오행이 일시적으로 약해진 것인지
     원국 차원에서 구조적으로 약한 것인지 판단

3. 과목별 맞춤 공략법
   ─ 강점 과목: 1등급/만점으로 끌어올리는 사주 에너지 활용법
   ─ 약점 과목: 오행 보완을 통한 거부감 해소 전략
     예: 수(水) 부족으로 영어가 약하면 →
         물 기운 보강: 파란색 필기구 사용, 저녁 시간대 학습,
         음악 들으며 공부, 유연한 학습 방식(다양한 교재 로테이션)
   ─ 각 약점 과목당 구체적 행동 지침 3가지

4. 하루 시간표 설계 (오행 시간대 기반)
   ─ 12지지 시간대별 에너지 특성과 학생 사주의 궁합 분석
   ─ 과목별 최적 학습 시간 배치표 제안
   ─ 과목 전환 시 뇌 리셋을 위한 오행 전환 팁
     (예: 수학→국어 전환 시 금→목 전환 = 잠깐 스트레칭)

5. 시험 주간 전략
   ─ 시험 2주 전: 과목별 우선순위 배치 (투자 대비 효율 기준)
   ─ 시험 1주 전: 오행 밸런스 생활 루틴
   ─ 시험 당일: 과목 순서별 에너지 전환 팁
   ─ 시험 사이 쉬는 시간 활용법

───────────────────────────────────
[톤 & 주의사항]
• "이 과목은 안 맞는다"가 아닌
  "다른 접근법이 필요한 과목"으로 표현합니다.
• 어떤 과목도 포기하지 않도록 동기를 부여하되,
  전략적 시간 배분의 현실성도 함께 제시합니다.
• 구체적인 행동으로 연결되지 않는 추상적 조언은 하지 않습니다.
• 과목별 전략은 실제 학교 수업·시험 상황에 적용 가능해야 합니다.
• 마크다운 형식으로 작성합니다.
───────────────────────────────────
`.trim(), additionalRequest),
  },
}

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------

/** 프롬프트 옵션 목록 (UI 드롭다운용) */
export function getPromptOptions(): AnalysisPromptMeta[] {
  return Object.values(PROMPT_DEFINITIONS).map((d) => d.meta)
}

/** ID로 프롬프트 정의 조회 */
export function getPromptDefinition(id: AnalysisPromptId): AnalysisPromptDefinition {
  return PROMPT_DEFINITIONS[id] ?? PROMPT_DEFINITIONS.default
}

/**
 * DB 프리셋 템플릿으로부터 프롬프트를 빌드합니다.
 * 템플릿 내 {학생정보}, {사주데이터} 플레이스홀더를 실제 값으로 치환합니다.
 */
export function buildPromptFromTemplate(
  template: string,
  sajuResult: SajuResult,
  studentInfo?: StudentInfo,
  additionalRequest?: string,
): string {
  const filled = template
    .replaceAll("{학생정보}", formatStudentInfo(studentInfo))
    .replaceAll("{사주데이터}", formatSajuData(sajuResult))
  return appendAdditionalRequest(filled.trim(), additionalRequest)
}

/**
 * DB seed용: 코드 기본 프롬프트의 메타 + 템플릿 데이터를 반환합니다.
 * 각 프롬프트의 buildPrompt에서 사용하는 템플릿을 {학생정보}, {사주데이터} 플레이스홀더 방식으로 추출합니다.
 */
export function getBuiltInSeedData(): Array<{
  analysisType: "saju"
  promptKey: string
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string[]
  promptTemplate: string
  sortOrder: number
}> {
  // default 프롬프트 템플릿 (SAJU_INTERPRETATION_PROMPT 기반)
  const defaultTemplate = `역할:
너는 한국 전통 사주명리학 전문가야. 아래 사주 데이터를 바탕으로 학생에게 도움이 되는 해석을 제공해줘.

[학생 정보]
─────────────────
{학생정보}
─────────────────

[학생 사주 데이터]
─────────────────
{사주데이터}
─────────────────

다음 항목을 포함하여 해석해주세요:

1. **일주 분석**: 일간(日干)의 특성과 기본 성격
2. **오행 균형**: 강한 오행과 부족한 오행, 그에 따른 성향
3. **십성 해석**: 십성 관계가 나타내는 대인관계 및 적성
4. **학업/진로**: 사주에서 읽을 수 있는 학업 적성과 진로 방향
5. **종합 조언**: 학생에게 도움이 될 수 있는 격려의 말

**중요:**
- 과학적 근거가 없는 전통 해석임을 명시
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감을 해칠 수 있는 내용 제외
- 마크다운 형식으로 작성`

  // 나머지 프롬프트: buildPrompt 함수에서 실제 템플릿 추출
  // 더미 데이터로 호출 후 {학생정보}, {사주데이터}를 다시 플레이스홀더로 치환
  const STUDENT_PLACEHOLDER = "{학생정보}"
  const SAJU_PLACEHOLDER = "{사주데이터}"

  const dummyStudent: StudentInfo = {
    birthDate: "___BIRTH_DATE___",
    birthTime: "___BIRTH_TIME___",
  }
  const dummySaju: SajuResult = {
    pillars: {
      year: { stem: "갑", branch: "자" },
      month: { stem: "병", branch: "인" },
      day: { stem: "무", branch: "오" },
      hour: { stem: "경", branch: "신" },
    },
    elements: { "목": 2, "화": 3, "토": 1, "금": 1, "수": 1 },
    tenGods: { year: "편재", month: "편인", hour: "식신" },
    meta: {
      solarYear: 2008, solarTerm: "소한", solarTermIndex: 0,
      monthIndex: 0, dayIndex: 0, timeKnown: true,
      kstTimestamp: "", correctedTimestamp: "", longitude: 127.0,
      solarCorrectionMinutes: 0, dstAdjusted: false,
    },
  }

  const dummyStudentStr = formatStudentInfo(dummyStudent)
  const dummySajuStr = formatSajuData(dummySaju)

  function extractTemplate(id: AnalysisPromptId): string {
    if (id === "default") return defaultTemplate
    const rendered = PROMPT_DEFINITIONS[id].buildPrompt(dummySaju, dummyStudent)
    return rendered
      .replaceAll(dummyStudentStr, STUDENT_PLACEHOLDER)
      .replaceAll(dummySajuStr, SAJU_PLACEHOLDER)
  }

  const ids: AnalysisPromptId[] = ["default", "learning-dna", "exam-slump", "career-navi", "mental-energy", "subject-strategy"]
  return ids.map((id, index) => {
    const meta = PROMPT_DEFINITIONS[id].meta
    return {
      analysisType: "saju" as const,
      promptKey: id,
      name: meta.name,
      shortDescription: meta.shortDescription,
      target: meta.target,
      levels: meta.levels,
      purpose: meta.purpose,
      recommendedTiming: meta.recommendedTiming,
      tags: meta.tags,
      promptTemplate: extractTemplate(id),
      sortOrder: index,
    }
  })
}

/** 샘플 데이터 (미리보기용) */
const SAMPLE_SAJU: SajuResult = {
  pillars: {
    year: { stem: "갑", branch: "자" },
    month: { stem: "병", branch: "인" },
    day: { stem: "무", branch: "오" },
    hour: { stem: "경", branch: "신" },
  },
  elements: { "목": 2, "화": 3, "토": 1, "금": 1, "수": 1 },
  tenGods: { year: "편재", month: "편인", hour: "식신" },
  meta: {
    solarYear: 2008, solarTerm: "소한", solarTermIndex: 0,
    monthIndex: 0, dayIndex: 0, timeKnown: true,
    kstTimestamp: "2008-01-10T06:30:00+09:00",
    correctedTimestamp: "2008-01-10T06:30:00+09:00",
    longitude: 127.0, solarCorrectionMinutes: 0, dstAdjusted: false,
  },
}
const SAMPLE_STUDENT: StudentInfo = {
  birthDate: "2008-01-10",
  birthTime: "06:30",
  gender: "남",
  grade: 11,
  school: "OO고등학교",
}

/** 프롬프트 미리보기 텍스트 (샘플 사주 데이터 적용) -- 코드 기본 프롬프트용 */
export function getPromptPreviewText(id: AnalysisPromptId): string {
  return getPromptDefinition(id).buildPrompt(SAMPLE_SAJU, SAMPLE_STUDENT)
}

/** DB 템플릿 기반 미리보기 텍스트 */
export function getTemplatePreviewText(template: string): string {
  return buildPromptFromTemplate(template, SAMPLE_SAJU, SAMPLE_STUDENT)
}
