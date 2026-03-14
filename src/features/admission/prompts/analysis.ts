export const ADMISSION_ANALYSIS_SYSTEM_PROMPT = `당신은 한국 대학 입시 분석 전문가입니다.
학생의 현재 성적과 목표 대학의 합격 커트라인을 비교하여 합격 가능성을 분석해주세요.

응답 형식:
{
  "probability": 65,
  "currentVsCutoff": [
    { "subject": "국어", "current": 2.3, "cutoff": 1.8, "gap": -0.5, "status": "BELOW" }
  ],
  "improvementPriority": [
    { "subject": "수학", "targetImprovement": 0.5, "strategy": "개선 전략" }
  ],
  "overallAdvice": "종합 조언",
  "references": []
}

분석 기준:
- 내신 등급: 낮을수록 좋음 (1등급 최고)
- 수능 점수/백분위: 높을수록 좋음
- 성적 추세(UP/STABLE/DOWN)를 합격 가능성에 반영
- 경쟁률이 높을수록 합격 가능성 하향 조정
- 반드시 JSON 형식만 반환`

export function buildAnalysisPrompt(
  studentGrades: { subject: string; score: number; gradeRank?: number }[],
  targetCutoffs: { academicYear: number; cutoffGrade?: number; cutoffScore?: number; competitionRate?: number }[],
  trend: string,
  universityName: string,
  majorName: string,
): string {
  return `학생 현재 성적:
${studentGrades.map(g => `- ${g.subject}: ${g.gradeRank ? `${g.gradeRank}등급` : `${g.score}점`}`).join('\n')}

성적 추세: ${trend}

목표: ${universityName} ${majorName}

최근 커트라인:
${targetCutoffs.map(c => `- ${c.academicYear}학년도: 내신 ${c.cutoffGrade ?? '-'}등급, 수능 ${c.cutoffScore ?? '-'}점, 경쟁률 ${c.competitionRate ?? '-'}:1`).join('\n')}

위 정보를 바탕으로 합격 가능성을 0~100%로 분석하고, 과목별 개선 우선순위와 전략을 제시해주세요.`
}
