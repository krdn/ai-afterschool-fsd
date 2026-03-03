import { db } from '@/lib/db/client';
import type { Prisma } from '@/lib/db';
import { getStudentProfile } from '../analysis/student-profiler';
import { generateAnalysis } from '../analysis/llm-composer';
import type { PeerComparison } from '../types';
import { logger } from '@/lib/logger';

/**
 * 같은 학년+학교 학생들과의 비교 분석을 수행한다.
 * 프라이버시: 최소 5명 이상일 때만 비교 가능
 */
export async function analyzePeerComparison(
  studentId: string,
  teacherId?: string
): Promise<PeerComparison> {
  // 캐시 확인 (24시간)
  const cached = await db.learningAnalysis.findFirst({
    where: {
      studentId,
      analysisType: 'COACHING', // COACHING 타입을 동료 비교에도 활용
      targetExamType: 'PEER_COMPARISON',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return cached.analysisData as unknown as PeerComparison;
  }

  // 학생 프로필 조회
  const profile = await getStudentProfile(studentId);
  if (!profile) {
    throw new Error('학생 정보를 찾을 수 없습니다.');
  }

  if (profile.gradeHistory.length === 0) {
    throw new Error('비교할 성적 데이터가 없습니다.');
  }

  // 같은 학년 + 학교 학생들 조회
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { school: true, grade: true },
  });

  if (!student) {
    throw new Error('학생 정보를 찾을 수 없습니다.');
  }

  // 동일 학교+학년 학생 ID 조회
  const peers = await db.student.findMany({
    where: {
      school: student.school,
      grade: student.grade,
    },
    select: { id: true },
  });

  // 프라이버시: 최소 5명 이상
  if (peers.length < 5) {
    throw new Error(
      `비교 분석에는 최소 5명의 같은 학교/학년 학생이 필요합니다. (현재 ${peers.length}명)`
    );
  }

  const peerIds = peers.map((p) => p.id);

  // 학생의 과목별 최근 성적 가져오기
  const studentGrades = await getRecentSubjectGrades(studentId);
  if (studentGrades.size === 0) {
    throw new Error('비교할 최근 성적 데이터가 없습니다.');
  }

  // 동급생 전체 성적 가져오기
  const peerGrades = await db.gradeHistory.findMany({
    where: {
      studentId: { in: peerIds },
    },
    select: {
      studentId: true,
      subject: true,
      normalizedScore: true,
      testDate: true,
    },
    orderBy: { testDate: 'desc' },
  });

  // 과목별 반 평균, 백분위 계산
  const subjectComparisons = calculateSubjectComparisons(
    studentId,
    studentGrades,
    peerGrades,
    peerIds.length
  );

  // 전체 백분위 계산
  const overallPercentile = calculateOverallPercentile(
    studentId,
    peerGrades,
    peerIds.length
  );

  // LLM 코멘트 생성
  let comment: string;
  try {
    const prompt = buildPeerComparisonPrompt(
      subjectComparisons,
      overallPercentile,
      profile
    );
    const llmResponse = await generateAnalysis(profile, prompt, teacherId);
    comment = llmResponse.trim();
  } catch (error) {
    logger.warn({ err: error }, 'LLM 동료 비교 코멘트 생성 실패');
    comment = generateStatComment(subjectComparisons, overallPercentile);
  }

  const result: PeerComparison = {
    subjects: subjectComparisons,
    overallPercentile,
    comment,
  };

  // DB 캐싱
  await db.learningAnalysis.create({
    data: {
      studentId,
      teacherId,
      analysisType: 'COACHING',
      targetExamType: 'PEER_COMPARISON',
      analysisData: result as unknown as Prisma.InputJsonValue,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return result;
}

/**
 * 학생의 최근 과목별 성적 (과목당 최신 1개)
 */
async function getRecentSubjectGrades(studentId: string) {
  const grades = await db.gradeHistory.findMany({
    where: { studentId },
    orderBy: { testDate: 'desc' },
    select: {
      subject: true,
      normalizedScore: true,
      testDate: true,
    },
  });

  // 과목별 가장 최근 성적
  const subjectMap = new Map<string, { score: number; testDate: Date }>();
  for (const g of grades) {
    if (!subjectMap.has(g.subject)) {
      subjectMap.set(g.subject, {
        score: g.normalizedScore,
        testDate: g.testDate,
      });
    }
  }

  return subjectMap;
}

/**
 * 과목별 비교 결과 계산
 */
function calculateSubjectComparisons(
  studentId: string,
  studentGrades: Map<string, { score: number; testDate: Date }>,
  peerGrades: { studentId: string; subject: string; normalizedScore: number; testDate: Date }[],
  totalPeers: number
): PeerComparison['subjects'] {
  const results: PeerComparison['subjects'] = [];

  for (const [subject, studentData] of studentGrades) {
    // 해당 과목의 동급생 성적
    const subjectPeerGrades = peerGrades.filter(
      (g) => g.subject === subject
    );

    if (subjectPeerGrades.length === 0) continue;

    // 학생별 최근 점수만 추출
    const peerLatestScores = new Map<string, number>();
    for (const g of subjectPeerGrades) {
      if (!peerLatestScores.has(g.studentId)) {
        peerLatestScores.set(g.studentId, g.normalizedScore);
      }
    }

    const allScores = Array.from(peerLatestScores.values());
    const classAverage =
      allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : 0;

    // 백분위 계산: 자기보다 낮은 학생 비율
    const belowCount = allScores.filter(
      (s) => s < studentData.score
    ).length;
    const percentile =
      allScores.length > 0
        ? Math.round((belowCount / allScores.length) * 100)
        : 50;

    // 추이 계산: 과거 2회 이상 시험 결과가 있으면 비교
    const studentSubjectHistory = peerGrades
      .filter((g) => g.studentId === studentId && g.subject === subject)
      .sort((a, b) => a.testDate.getTime() - b.testDate.getTime());

    let trend: 'UP' | 'STABLE' | 'DOWN' = 'STABLE';
    if (studentSubjectHistory.length >= 2) {
      const recent = studentSubjectHistory[studentSubjectHistory.length - 1].normalizedScore;
      const previous = studentSubjectHistory[studentSubjectHistory.length - 2].normalizedScore;
      if (recent - previous > 3) trend = 'UP';
      else if (previous - recent > 3) trend = 'DOWN';
    }

    results.push({
      name: subject,
      studentScore: studentData.score,
      classAverage,
      percentile,
      trend,
    });
  }

  return results.sort((a, b) => b.percentile - a.percentile);
}

/**
 * 전체 종합 백분위 계산
 */
function calculateOverallPercentile(
  studentId: string,
  peerGrades: { studentId: string; normalizedScore: number }[],
  totalPeers: number
): number {
  // 학생별 전체 과목 평균 점수
  const studentAvgMap = new Map<string, { total: number; count: number }>();

  for (const g of peerGrades) {
    const existing = studentAvgMap.get(g.studentId) || { total: 0, count: 0 };
    existing.total += g.normalizedScore;
    existing.count += 1;
    studentAvgMap.set(g.studentId, existing);
  }

  const studentAvg = studentAvgMap.get(studentId);
  if (!studentAvg || studentAvg.count === 0) return 50;

  const myAvg = studentAvg.total / studentAvg.count;

  const allAvgs = Array.from(studentAvgMap.values()).map(
    (s) => s.total / s.count
  );

  const belowCount = allAvgs.filter((avg) => avg < myAvg).length;
  return allAvgs.length > 0
    ? Math.round((belowCount / allAvgs.length) * 100)
    : 50;
}

/**
 * LLM 프롬프트 생성
 */
function buildPeerComparisonPrompt(
  subjects: PeerComparison['subjects'],
  overallPercentile: number,
  profile: Awaited<ReturnType<typeof getStudentProfile>>
): string {
  const subjectInfo = subjects
    .map(
      (s) =>
        `${s.name}: ${s.studentScore}점 (반평균 ${s.classAverage}, 백분위 ${s.percentile}%, 추이 ${s.trend})`
    )
    .join('\n');

  return `학생의 동료 비교 분석 결과에 대해 짧은 코멘트를 작성해주세요.

## 과목별 비교
${subjectInfo}

## 종합 백분위: ${overallPercentile}%
## 학생: ${profile?.name || ''}, ${profile?.school || ''} ${profile?.grade || ''}학년

요구사항:
- 3~5문장으로 간결하게
- 강점을 먼저 언급
- 개선 필요 과목은 건설적으로 표현
- 격려하는 톤으로
- JSON 없이 텍스트만 응답`;
}

/**
 * 통계 기반 자동 코멘트 생성 (LLM 실패 시 폴백)
 */
function generateStatComment(
  subjects: PeerComparison['subjects'],
  overallPercentile: number
): string {
  const strong = subjects.filter((s) => s.percentile >= 70);
  const weak = subjects.filter((s) => s.percentile < 30);

  let comment = `전체 종합 백분위 ${overallPercentile}%입니다. `;

  if (strong.length > 0) {
    comment += `${strong.map((s) => s.name).join(', ')}에서 우수한 성과를 보이고 있습니다. `;
  }

  if (weak.length > 0) {
    comment += `${weak.map((s) => s.name).join(', ')} 과목은 추가 학습이 필요합니다.`;
  } else {
    comment += '전반적으로 양호한 수준입니다.';
  }

  return comment;
}
