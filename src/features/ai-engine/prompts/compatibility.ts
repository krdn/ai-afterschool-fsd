/**
 * 궁합 분석 전문 프롬프트 정의
 *
 * LLM이 학생-선생님 궁합을 분석하고 JSON 형태로 점수를 반환하도록 합니다.
 * 한 번의 호출로 학생 1명 vs 전체 선생님을 분석합니다.
 */

import type { MbtiPercentages } from "@/features/analysis"
import type { SajuResult } from "@/features/analysis"
import type { NameNumerologyResult } from "@/features/analysis"

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type StudentData = {
  id: string
  name: string
  mbti: MbtiPercentages | null
  saju: SajuResult | null
  nameAnalysis: NameNumerologyResult | null
}

export type TeacherData = {
  id: string
  name: string
  role: string
  mbti: MbtiPercentages | null
  saju: SajuResult | null
  nameAnalysis: NameNumerologyResult | null
  currentStudentCount: number
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

export const COMPATIBILITY_SYSTEM_PROMPT = `당신은 교육 전문가이자 심리상담사입니다.
학생과 선생님의 분석 데이터(MBTI, 사주 오행, 성명학)를 바탕으로 궁합을 평가하고,
최적의 학생-선생님 매칭을 추천하는 역할입니다.

## 평가 기준 (총 100점)

각 항목의 점수를 아래 범위 내에서 배정하세요:

1. **mbti** (0~20점): MBTI 퍼센티지 유사도, 교육 상황에서의 소통 호환성
2. **learningStyle** (0~10점): MBTI 기반 학습 스타일 호환성 (E/I → 수업 방식, S/N → 정보 전달, T/F → 피드백 스타일, J/P → 수업 구조)
3. **saju** (0~50점): 사주 오행의 상생/상극 관계, 천간·지지 궁합, 일간 호환성, 교육적 시너지
4. **name** (0~10점): 성명학 4격(원격·형격·이격·정격)의 조화
5. **loadBalance** (0~10점): 선생님의 현재 담당 학생 수 기반 부하 분산 (적을수록 높은 점수)

## 출력 형식

반드시 아래 JSON 형식만 출력하세요. 설명이나 마크다운 없이 순수 JSON만 반환합니다.

\`\`\`json
{
  "recommendations": [
    {
      "teacherId": "선생님ID",
      "overall": 85.5,
      "breakdown": {
        "mbti": 18.0,
        "learningStyle": 8.5,
        "saju": 42.0,
        "name": 8.0,
        "loadBalance": 9.0
      },
      "reasons": ["MBTI E/I 비율이 유사하여 소통 방식이 잘 맞습니다", "사주 오행에서 목-화 상생 관계가 교육적 시너지를 만듭니다", "성명학 4격의 수리가 조화로워 관계가 원만할 것으로 보입니다"]
    }
  ]
}
\`\`\`

## 주의사항
- overall은 breakdown 5항목의 합산입니다
- reasons는 한국어로 2~4개, 각각 구체적인 분석 근거를 포함하여 작성하세요 (예: "MBTI E75%/I25% vs E60%/I40%로 외향성이 비슷하여...")
- 모든 선생님에 대해 빠짐없이 분석하세요
- 데이터가 누락된 항목은 중간 점수(해당 항목 만점의 50%)를 부여하세요
- JSON 외의 텍스트를 절대 출력하지 마세요`

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------

function formatMbti(mbti: MbtiPercentages | null): string {
  if (!mbti) return "데이터 없음"
  return `E${mbti.E}/I${mbti.I}, S${mbti.S}/N${mbti.N}, T${mbti.T}/F${mbti.F}, J${mbti.J}/P${mbti.P}`
}

function formatSaju(saju: SajuResult | null): string {
  if (!saju) return "데이터 없음"
  const { elements } = saju
  return `목${elements["목"] ?? 0} 화${elements["화"] ?? 0} 토${elements["토"] ?? 0} 금${elements["금"] ?? 0} 수${elements["수"] ?? 0}`
}

function formatNameAnalysis(name: NameNumerologyResult | null): string {
  if (!name) return "데이터 없음"
  const { grids } = name
  return `원격${grids.won} 형격${grids.hyung} 이격${grids.yi} 정격${grids.jeong}`
}

function formatRole(role: string): string {
  switch (role) {
    case "TEAM_LEADER": return "팀장"
    case "MANAGER": return "매니저"
    case "TEACHER": return "선생님"
    default: return role
  }
}

// ---------------------------------------------------------------------------
// User Prompt Builder
// ---------------------------------------------------------------------------

/**
 * 궁합 분석용 User Prompt를 생성합니다.
 *
 * 학생 1명과 전체 선생님 목록을 받아 분석 요청 프롬프트를 만듭니다.
 */
export function buildCompatibilityPrompt(
  student: StudentData,
  teachers: TeacherData[],
): string {
  const studentSection = `## 학생 정보
- 이름: ${student.name}
- MBTI: ${formatMbti(student.mbti)}
- 사주 오행: ${formatSaju(student.saju)}
- 성명학: ${formatNameAnalysis(student.nameAnalysis)}`

  const teacherLines = teachers.map((t, i) =>
    `### ${i + 1}. ${t.name} (ID: ${t.id})
- 역할: ${formatRole(t.role)}
- MBTI: ${formatMbti(t.mbti)}
- 사주 오행: ${formatSaju(t.saju)}
- 성명학: ${formatNameAnalysis(t.nameAnalysis)}
- 현재 담당 학생 수: ${t.currentStudentCount}명`
  ).join("\n\n")

  return `아래 학생과 모든 선생님의 궁합을 분석하고 JSON으로 반환하세요.

${studentSection}

## 선생님 목록 (${teachers.length}명)

${teacherLines}

위 정보를 바탕으로 모든 선생님에 대한 궁합 점수를 JSON 형식으로 반환하세요.`
}
