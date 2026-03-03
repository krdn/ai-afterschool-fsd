import { generateWithProvider } from '@/features/ai-engine/universal-router';
import { logger } from '@/lib/logger';
import type { StudentProfile } from './student-profiler';

/**
 * 학생 프로필을 LLM에 전달하여 분석 텍스트를 생성한다.
 */
export async function generateAnalysis(
  profile: StudentProfile,
  analysisPrompt: string,
  teacherId?: string
): Promise<string> {
  const systemPrompt = `당신은 한국 교육 전문가이자 학습 코칭 전문가입니다.
학생의 성적 데이터, 학습 스타일(MBTI, VARK), 성격 분석을 종합하여
구체적이고 실행 가능한 학습 조언을 제공합니다.
반드시 한국어로 답변하세요.`;

  const profileContext = buildProfileContext(profile);

  try {
    const result = await generateWithProvider({
      featureType: 'grade_analysis',
      teacherId,
      prompt: `${profileContext}\n\n${analysisPrompt}`,
      system: systemPrompt,
      maxOutputTokens: 2048,
      temperature: 0.3,
    });

    return result.text;
  } catch (error) {
    logger.error({ err: error }, 'LLM 분석 생성 실패');
    throw error;
  }
}

function buildProfileContext(profile: StudentProfile): string {
  const lines: string[] = [
    `## 학생 정보`,
    `- 이름: ${profile.name}`,
    `- 학교/학년: ${profile.school} ${profile.grade}학년`,
  ];

  if (profile.targetUniversity) lines.push(`- 목표 대학: ${profile.targetUniversity}`);
  if (profile.targetMajor) lines.push(`- 목표 학과: ${profile.targetMajor}`);
  if (profile.mbtiType) lines.push(`- MBTI: ${profile.mbtiType}`);
  if (profile.varkType) lines.push(`- VARK 학습스타일: ${profile.varkType}`);
  if (profile.attendanceRate != null) lines.push(`- 출석률: ${profile.attendanceRate}%`);

  if (profile.gradeHistory.length > 0) {
    lines.push('\n## 최근 내신 성적');
    const recent = profile.gradeHistory.slice(-10);
    recent.forEach((g) => {
      const rank = g.gradeRank ? ` (${g.gradeRank}등급)` : '';
      lines.push(`- ${g.subject}: ${g.score}점${rank} (${g.testDate.toISOString().split('T')[0]})`);
    });
  }

  if (profile.mockExamResults.length > 0) {
    lines.push('\n## 최근 모의고사 성적');
    const recent = profile.mockExamResults.slice(-10);
    recent.forEach((m) => {
      const std = m.standardScore ? `, 표준점수 ${m.standardScore}` : '';
      const pct = m.percentile ? `, 백분위 ${m.percentile}` : '';
      lines.push(`- ${m.subject}: 원점수 ${m.rawScore}${std}${pct}`);
    });
  }

  return lines.join('\n');
}
