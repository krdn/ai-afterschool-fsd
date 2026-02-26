import { getStudentProfile } from '../analysis/student-profiler';
import { generateAnalysis } from '../analysis/llm-composer';
import { getStudyStats } from './study-log-service';
import type { StudyHabitCorrelation } from '../types';
import { logger } from '@/lib/logger';

/**
 * 학생의 학습 습관을 분석하고 성적과의 상관관계를 파악한다.
 * 통계 분석 + LLM 인사이트를 결합하여 결과를 생성한다.
 */
export async function analyzeStudyHabits(
  studentId: string,
  teacherId?: string
): Promise<StudyHabitCorrelation> {
  // 학생 프로필 수집
  const profile = await getStudentProfile(studentId);
  if (!profile) {
    throw new Error('학생 정보를 찾을 수 없습니다.');
  }

  // 최근 30일 학습 통계
  const stats = await getStudyStats(studentId, 30);

  if (stats.totalMinutes === 0) {
    return {
      correlations: [],
      recommendations: ['학습 기록을 등록하면 습관 분석을 받을 수 있습니다.'],
    };
  }

  // 통계 기반 상관관계 분석
  const statCorrelations = buildStatCorrelations(stats);

  // LLM 인사이트 생성
  try {
    const prompt = buildHabitAnalysisPrompt(stats, profile);
    const llmResponse = await generateAnalysis(profile, prompt, teacherId);

    // JSON 파싱 시도
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as StudyHabitCorrelation;
      // LLM 결과와 통계 결과를 병합
      return mergeResults(statCorrelations, parsed);
    }

    return statCorrelations;
  } catch (error) {
    logger.warn({ err: error }, 'LLM 학습 습관 분석 실패, 통계 결과만 반환');
    return statCorrelations;
  }
}

/**
 * 통계 데이터를 기반으로 상관관계를 분석한다.
 */
function buildStatCorrelations(
  stats: Awaited<ReturnType<typeof getStudyStats>>
): StudyHabitCorrelation {
  const correlations: StudyHabitCorrelation['correlations'] = [];
  const recommendations: string[] = [];

  // 규칙성 분석
  if (stats.consistencyScore >= 70) {
    correlations.push({
      habit: '규칙적인 학습',
      impact: 'POSITIVE',
      affectedSubjects: stats.subjectDistribution.map((s) => s.subject),
      description: `학습 규칙성 ${stats.consistencyScore}%로 매우 우수합니다.`,
    });
  } else if (stats.consistencyScore >= 40) {
    correlations.push({
      habit: '불규칙한 학습',
      impact: 'NEUTRAL',
      affectedSubjects: [],
      description: `학습 규칙성 ${stats.consistencyScore}%로 개선 여지가 있습니다.`,
    });
    recommendations.push('매일 일정한 시간에 학습하는 습관을 만들어보세요.');
  } else {
    correlations.push({
      habit: '불규칙한 학습',
      impact: 'NEGATIVE',
      affectedSubjects: [],
      description: `학습 규칙성 ${stats.consistencyScore}%로 매우 낮습니다.`,
    });
    recommendations.push('매일 최소 30분이라도 학습하는 루틴을 시작해보세요.');
  }

  // 과목 편중 분석
  if (stats.subjectDistribution.length > 0) {
    const topSubject = stats.subjectDistribution[0];
    if (topSubject.percentage > 60) {
      correlations.push({
        habit: '과목 편중 학습',
        impact: 'NEGATIVE',
        affectedSubjects: stats.subjectDistribution
          .filter((s) => s.percentage < 10)
          .map((s) => s.subject),
        description: `${topSubject.subject}에 전체 학습 시간의 ${topSubject.percentage}%가 집중되어 있습니다.`,
      });
      recommendations.push(
        `${topSubject.subject} 외 다른 과목에도 시간을 배분해보세요.`
      );
    }
  }

  // 일평균 학습량 분석
  if (stats.dailyAverageMinutes >= 120) {
    correlations.push({
      habit: '충분한 학습량',
      impact: 'POSITIVE',
      affectedSubjects: stats.subjectDistribution.map((s) => s.subject),
      description: `일 평균 ${stats.dailyAverageMinutes}분으로 충분한 학습량입니다.`,
    });
  } else if (stats.dailyAverageMinutes < 60) {
    correlations.push({
      habit: '부족한 학습량',
      impact: 'NEGATIVE',
      affectedSubjects: [],
      description: `일 평균 ${stats.dailyAverageMinutes}분으로 학습량이 부족합니다.`,
    });
    recommendations.push('목표 학습 시간을 점진적으로 늘려보세요.');
  }

  // 학습 유형 다양성
  const reviewType = stats.taskTypeDistribution.find(
    (t) => t.taskType === 'REVIEW'
  );
  if (!reviewType || reviewType.totalMinutes < stats.totalMinutes * 0.1) {
    recommendations.push('복습 시간을 전체의 20% 이상 확보하면 기억 정착에 도움됩니다.');
  }

  return { correlations, recommendations };
}

/**
 * LLM 분석을 위한 프롬프트를 구성한다.
 */
function buildHabitAnalysisPrompt(
  stats: Awaited<ReturnType<typeof getStudyStats>>,
  profile: Awaited<ReturnType<typeof getStudentProfile>>
): string {
  const subjectInfo = stats.subjectDistribution
    .map((s) => `${s.subject}: ${s.totalMinutes}분 (${s.percentage}%)`)
    .join(', ');

  const taskInfo = stats.taskTypeDistribution
    .map((t) => `${t.taskType}: ${t.count}회, ${t.totalMinutes}분`)
    .join(', ');

  return `이 학생의 학습 습관과 성적 간의 상관관계를 분석해주세요.

## 최근 30일 학습 통계
- 총 학습 시간: ${stats.totalMinutes}분
- 일 평균: ${stats.dailyAverageMinutes}분
- 규칙성 점수: ${stats.consistencyScore}/100
- 과목별 분포: ${subjectInfo}
- 학습 유형: ${taskInfo}

## 학생 정보
- ${profile?.name || '(이름 없음)'}, ${profile?.school || ''} ${profile?.grade || ''}학년
- MBTI: ${profile?.mbtiType ?? '미측정'}
- VARK: ${profile?.varkType ?? '미측정'}

아래 JSON 형식으로만 응답해주세요:
{
  "correlations": [{"habit": "습관명", "impact": "POSITIVE|NEUTRAL|NEGATIVE", "affectedSubjects": ["과목"], "description": "설명"}],
  "recommendations": ["추천사항1", "추천사항2"]
}`;
}

/**
 * 통계 결과와 LLM 결과를 병합한다.
 */
function mergeResults(
  stat: StudyHabitCorrelation,
  llm: StudyHabitCorrelation
): StudyHabitCorrelation {
  // 통계 상관관계는 유지하되 LLM 추천사항은 추가
  const existingHabits = new Set(stat.correlations.map((c) => c.habit));
  const newCorrelations = llm.correlations.filter(
    (c) => !existingHabits.has(c.habit)
  );

  return {
    correlations: [...stat.correlations, ...newCorrelations],
    recommendations: [
      ...new Set([...stat.recommendations, ...llm.recommendations]),
    ],
  };
}
