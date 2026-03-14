import { createHash } from 'crypto';
import type { NeuroscienceCondition, BuiltCondition } from './types';

const VARK_LABELS: Record<string, string> = {
  V: '시각형(Visual)', A: '청각형(Auditory)',
  R: '읽기쓰기형(Read/Write)', K: '운동감각형(Kinesthetic)',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움', medium: '보통', hard: '어려움',
};

const TIME_LABELS: Record<string, string> = {
  morning: '오전', afternoon: '오후', evening: '저녁',
};

const LEVEL_LABELS: Record<string, string> = {
  low: '낮음', medium: '보통', high: '높음',
};

const GOAL_LABELS: Record<string, string> = {
  memorization: '암기', comprehension: '이해',
  problem_solving: '문제풀이', creativity: '창의성', review: '복습',
};

const TREND_LABELS: Record<string, string> = {
  improving: '상승세', stable: '안정', declining: '하락세',
};

function buildProfileSection(profile: NonNullable<NeuroscienceCondition['profile']>): string {
  const parts: string[] = [
    `이름: ${profile.name}`,
    `나이: ${profile.age}세`,
    `학년: ${profile.grade}학년`,
  ];
  if (profile.varkType) {
    const label = profile.varkType.split('').map(c => VARK_LABELS[c] || c).join('+');
    parts.push(`VARK 학습유형: ${label}`);
  }
  if (profile.mbtiType) parts.push(`MBTI: ${profile.mbtiType}`);
  if (profile.personalitySummary) parts.push(`성향 요약: ${profile.personalitySummary}`);
  if (profile.sajuTraits) parts.push(`사주 성향: ${profile.sajuTraits}`);
  return `[학생 프로필]\n${parts.join('\n')}`;
}

function buildSituationSection(sit: NonNullable<NeuroscienceCondition['situation']>): string {
  const parts: string[] = [
    `과목: ${sit.subject}`,
    `난이도: ${DIFFICULTY_LABELS[sit.difficulty] || sit.difficulty}`,
    `학습 시간대: ${TIME_LABELS[sit.timeOfDay] || sit.timeOfDay}`,
  ];
  if (sit.fatigueLevel) parts.push(`피로도: ${LEVEL_LABELS[sit.fatigueLevel]}`);
  if (sit.concentrationLevel) parts.push(`집중력: ${LEVEL_LABELS[sit.concentrationLevel]}`);
  if (sit.studyDuration) parts.push(`학습 예정 시간: ${sit.studyDuration}분`);
  return `[학습 상황]\n${parts.join('\n')}`;
}

function buildGoalSection(goal: NonNullable<NeuroscienceCondition['goal']>): string {
  const parts: string[] = [`학습 목표: ${GOAL_LABELS[goal.type] || goal.type}`];
  if (goal.specificTopic) parts.push(`구체적 주제: ${goal.specificTopic}`);
  return `[학습 목표]\n${parts.join('\n')}`;
}

function buildGradeSection(ctx: NonNullable<NeuroscienceCondition['gradeContext']>): string {
  const parts: string[] = [`성적 추이: ${TREND_LABELS[ctx.recentTrend] || ctx.recentTrend}`];
  if (ctx.averageScore !== undefined) parts.push(`평균 점수: ${ctx.averageScore}점`);
  if (ctx.weakSubjects.length > 0) parts.push(`취약 과목: ${ctx.weakSubjects.join(', ')}`);
  if (ctx.strongSubjects.length > 0) parts.push(`강점 과목: ${ctx.strongSubjects.join(', ')}`);
  return `[성적 데이터]\n${parts.join('\n')}`;
}

export function buildCondition(condition: NeuroscienceCondition): BuiltCondition {
  const sections: string[] = [];

  if (condition.profile) sections.push(buildProfileSection(condition.profile));
  if (condition.situation) sections.push(buildSituationSection(condition.situation));
  if (condition.goal) sections.push(buildGoalSection(condition.goal));
  if (condition.gradeContext) sections.push(buildGradeSection(condition.gradeContext));

  if (sections.length === 0) {
    sections.push('[조건 없음]\n일반적인 뇌과학 학습 전략을 추천해주세요.');
  }

  const contextString = sections.join('\n\n');
  const hash = createHash('sha256').update(JSON.stringify(condition)).digest('hex');

  return { condition, contextString, hash };
}
