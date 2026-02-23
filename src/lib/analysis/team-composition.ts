import { db } from "@/lib/db/client"
import { Prisma } from '@/lib/db'
import type {
  TeamComposition,
  TeamCompositionAnalysis,
  MBTIDistribution,
  LearningStyleDistribution,
  SajuElementsDistribution,
  ExpertiseCoverage,
  RoleDistribution,
  DiversityScore,
  Recommendation,
} from "@/features/matching"

const SUBJECTS = ["수학", "영어", "국어", "과학", "사회"] as const
const GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const

interface TeacherData {
  id: string
  name: string
  role: string
  mbtiAnalysis?: {
    mbtiType: string
    percentages: Prisma.JsonValue
  } | null
  sajuAnalysis?: {
    result: Prisma.JsonValue
  } | null
  createdAt: Date
  students?: Array<{
    grade: number
  }>
}

export async function analyzeTeamComposition(teamId: string): Promise<TeamCompositionAnalysis> {
  const teachers = await db.teacher.findMany({
    where: { teamId },
    include: {
      students: {
        select: { grade: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // 선생님 분석 데이터 일괄 조회 (통합 테이블)
  const teacherIds = teachers.map(t => t.id)
  const [mbtiAnalyses, sajuAnalyses] = await Promise.all([
    db.mbtiAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, mbtiType: true, percentages: true },
    }),
    db.sajuAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, result: true },
    }),
  ])

  const mbtiMap = new Map(mbtiAnalyses.map(m => [m.subjectId, m]))
  const sajuMap = new Map(sajuAnalyses.map(s => [s.subjectId, s]))

  // 분석 데이터를 병합한 TeacherData 배열 구성
  const teacherDataList: TeacherData[] = teachers.map(t => ({
    id: t.id,
    name: t.name,
    role: t.role,
    createdAt: t.createdAt,
    students: t.students,
    mbtiAnalysis: mbtiMap.get(t.id) ? {
      mbtiType: mbtiMap.get(t.id)!.mbtiType,
      percentages: mbtiMap.get(t.id)!.percentages,
    } : null,
    sajuAnalysis: sajuMap.get(t.id) ? {
      result: sajuMap.get(t.id)!.result,
    } : null,
  }))

  const teacherCount = teacherDataList.length

  const mbtiDistribution = analyzeMBTIDistribution(teacherDataList)
  const learningStyleDistribution = analyzeLearningStyleDistribution(teacherDataList)
  const sajuElementsDistribution = analyzeSajuElementsDistribution(teacherDataList)
  const expertiseCoverage = analyzeExpertiseCoverage(teacherDataList)
  const roleDistribution = analyzeRoleDistribution(teacherDataList)

  const composition: TeamComposition = {
    teamId,
    teacherCount,
    mbtiDistribution,
    learningStyleDistribution,
    sajuElementsDistribution,
    expertiseCoverage,
    roleDistribution,
  }

  const diversityScore = calculateDiversityScore(composition)
  const recommendations = getTeamRecommendations(composition, diversityScore)

  return {
    composition,
    diversityScore,
    recommendations,
    analyzedAt: new Date(),
  }
}

function analyzeMBTIDistribution(teachers: TeacherData[]): MBTIDistribution {
  const typeCounts: Record<string, number> = {}
  let e = 0, i = 0, s = 0, n = 0, t = 0, f = 0, j = 0, p = 0

  for (const teacher of teachers) {
    const mbti = teacher.mbtiAnalysis?.mbtiType
    if (!mbti) continue

    typeCounts[mbti] = (typeCounts[mbti] || 0) + 1

    const type = mbti.toUpperCase()
    e += type.includes('E') ? 1 : 0
    i += type.includes('I') ? 1 : 0
    s += type.includes('S') ? 1 : 0
    n += type.includes('N') ? 1 : 0
    t += type.includes('T') ? 1 : 0
    f += type.includes('F') ? 1 : 0
    j += type.includes('J') ? 1 : 0
    p += type.includes('P') ? 1 : 0
  }

  const types = Object.keys(typeCounts)
  const sorted = types.sort((a, b) => typeCounts[b] - typeCounts[a])
  const mostCommon = sorted.slice(0, 3)
  const rarest = sorted.slice(-3).reverse()

  const total = e + i
  return {
    typeCounts,
    mostCommon,
    rarest,
    axisRatios: {
      E: total > 0 ? (e / total) * 100 : 0,
      I: total > 0 ? (i / total) * 100 : 0,
      S: total > 0 ? (s / total) * 100 : 0,
      N: total > 0 ? (n / total) * 100 : 0,
      T: total > 0 ? (t / total) * 100 : 0,
      F: total > 0 ? (f / total) * 100 : 0,
      J: total > 0 ? (j / total) * 100 : 0,
      P: total > 0 ? (p / total) * 100 : 0,
    },
  }
}

function analyzeLearningStyleDistribution(teachers: TeacherData[]): LearningStyleDistribution {
  let visual = 0, auditory = 0, reading = 0, kinesthetic = 0
  let count = 0

  for (const teacher of teachers) {
    const percentages = teacher.mbtiAnalysis?.percentages as Record<string, number> | null
    if (!percentages) continue

    visual += percentages.visual || 0
    auditory += percentages.auditory || 0
    reading += percentages.reading || 0
    kinesthetic += percentages.kinesthetic || 0
    count++
  }

  if (count === 0) {
    return { visual: 0, auditory: 0, reading: 0, kinesthetic: 0, dominant: '-' }
  }

  const avg = (val: number) => Math.round(val / count)
  const v = avg(visual), a = avg(auditory), r = avg(reading), k = avg(kinesthetic)

  const styles = [
    { name: 'Visual', value: v },
    { name: 'Auditory', value: a },
    { name: 'Reading', value: r },
    { name: 'Kinesthetic', value: k },
  ]
  styles.sort((x, y) => y.value - x.value)

  return {
    visual: v,
    auditory: a,
    reading: r,
    kinesthetic: k,
    dominant: styles[0].name,
  }
}

function analyzeSajuElementsDistribution(teachers: TeacherData[]): SajuElementsDistribution {
  const elementCounts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }

  for (const teacher of teachers) {
    const result = teacher.sajuAnalysis?.result as { fiveElements?: Record<string, number> } | null
    if (!result?.fiveElements) continue

    const elements = result.fiveElements
    if (elements.wood) elementCounts.wood += elements.wood
    if (elements.fire) elementCounts.fire += elements.fire
    if (elements.earth) elementCounts.earth += elements.earth
    if (elements.metal) elementCounts.metal += elements.metal
    if (elements.water) elementCounts.water += elements.water
  }

  const total = elementCounts.wood + elementCounts.fire + elementCounts.earth + elementCounts.metal + elementCounts.water

  if (total === 0) {
    return {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
      dominant: '-',
      deficient: [],
    }
  }

  const elements = [
    { name: '목', key: 'wood', value: elementCounts.wood },
    { name: '화', key: 'fire', value: elementCounts.fire },
    { name: '토', key: 'earth', value: elementCounts.earth },
    { name: '금', key: 'metal', value: elementCounts.metal },
    { name: '수', key: 'water', value: elementCounts.water },
  ]
  elements.sort((x, y) => y.value - x.value)

  const avg = total / 5
  const deficient: string[] = []
  for (const elem of elements) {
    if (elem.value < avg * 0.7) {
      deficient.push(elem.name)
    }
  }

  return {
    wood: Math.round((elementCounts.wood / total) * 100),
    fire: Math.round((elementCounts.fire / total) * 100),
    earth: Math.round((elementCounts.earth / total) * 100),
    metal: Math.round((elementCounts.metal / total) * 100),
    water: Math.round((elementCounts.water / total) * 100),
    dominant: elements[0].name,
    deficient,
  }
}

function analyzeExpertiseCoverage(teachers: TeacherData[]): ExpertiseCoverage {
  const subjects: Record<string, number> = {}
  const grades: Record<string, number> = {}
  let junior = 0, mid = 0, senior = 0

  const now = new Date()

  for (const teacher of teachers) {
    const studentGrades = teacher.students?.map(s => s.grade) || []

    for (const grade of studentGrades) {
      const gradeLabel = gradeToLabel(grade)
      grades[gradeLabel] = (grades[gradeLabel] || 0) + 1
    }

    const experienceYears = (now.getTime() - teacher.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (experienceYears < 1) junior++
    else if (experienceYears < 3) mid++
    else senior++
  }

  SUBJECTS.forEach(sub => {
    subjects[sub] = subjects[sub] || 0
  })

  GRADES.forEach(grade => {
    grades[grade] = grades[grade] || 0
  })

  const avgSubjectCoverage = teachers.length > 0 ? teachers.length / SUBJECTS.length : 0
  const weakSubjects: string[] = []
  for (const subject of SUBJECTS) {
    if ((subjects[subject] || 0) < avgSubjectCoverage * 0.5) {
      weakSubjects.push(subject)
    }
  }

  const avgGradeCoverage = teachers.length > 0 ? teachers.length / GRADES.length : 0
  const weakGrades: string[] = []
  for (const grade of GRADES) {
    if ((grades[grade] || 0) < avgGradeCoverage * 0.5) {
      weakGrades.push(grade)
    }
  }

  return {
    subjects,
    grades,
    experienceLevels: { junior, mid, senior },
    weakSubjects,
    weakGrades,
  }
}

function gradeToLabel(grade: number): string {
  if (grade <= 3) return `중${grade}`
  return `고${grade - 3}`
}

function analyzeRoleDistribution(teachers: TeacherData[]): RoleDistribution {
  const distribution = { TEAM_LEADER: 0, MANAGER: 0, TEACHER: 0 }

  for (const teacher of teachers) {
    const role = teacher.role as keyof RoleDistribution
    if (role in distribution) {
      distribution[role]++
    }
  }

  return distribution
}

function calculateShannonDiversity(counts: number[], total: number): number {
  if (total === 0) return 0

  let sum = 0
  for (const count of counts) {
    if (count === 0) continue
    const p = count / total
    sum += p * Math.log(p)
  }

  const maxDiversity = Math.log(counts.length)
  const shannon = -sum / maxDiversity

  return Math.min(Math.max(shannon * 100, 0), 100)
}

export function calculateDiversityScore(composition: TeamComposition): DiversityScore {
  const { mbtiDistribution, learningStyleDistribution, sajuElementsDistribution, expertiseCoverage } = composition

  const mbtiCounts = Object.values(mbtiDistribution.typeCounts)
  const mbtiDiversity = calculateShannonDiversity(mbtiCounts, composition.teacherCount)

  const learningStyleCounts = [
    learningStyleDistribution.visual,
    learningStyleDistribution.auditory,
    learningStyleDistribution.reading,
    learningStyleDistribution.kinesthetic,
  ]
  const learningStyleDiversity = calculateShannonDiversity(learningStyleCounts, composition.teacherCount * 100)

  const sajuCounts = [
    sajuElementsDistribution.wood,
    sajuElementsDistribution.fire,
    sajuElementsDistribution.earth,
    sajuElementsDistribution.metal,
    sajuElementsDistribution.water,
  ]
  const sajuElementsDiversity = calculateShannonDiversity(sajuCounts, 100)

  const subjectCounts = Object.values(expertiseCoverage.subjects)
  const totalSubjectTeachers = subjectCounts.reduce((a, b) => a + b, 0)
  const subjectDiversity = totalSubjectTeachers > 0
    ? calculateShannonDiversity(subjectCounts, totalSubjectTeachers)
    : 0

  const gradeCounts = Object.values(expertiseCoverage.grades)
  const totalGradeTeachers = gradeCounts.reduce((a, b) => a + b, 0)
  const gradeDiversity = totalGradeTeachers > 0
    ? calculateShannonDiversity(gradeCounts, totalGradeTeachers)
    : 0

  const overall = (mbtiDiversity + learningStyleDiversity + sajuElementsDiversity + subjectDiversity + gradeDiversity) / 5

  return {
    overall: Math.round(overall),
    mbtiDiversity: Math.round(mbtiDiversity),
    learningStyleDiversity: Math.round(learningStyleDiversity),
    sajuElementsDiversity: Math.round(sajuElementsDiversity),
    subjectDiversity: Math.round(subjectDiversity),
    gradeDiversity: Math.round(gradeDiversity),
  }
}

export function getTeamRecommendations(composition: TeamComposition, diversityScore: DiversityScore): Recommendation[] {
  const recommendations: Recommendation[] = []

  const { learningStyleDistribution, sajuElementsDistribution, expertiseCoverage } = composition

  if (learningStyleDistribution.dominant === 'Visual') {
    const nonVisual = 100 - learningStyleDistribution.visual
    if (nonVisual < 40) {
      recommendations.push({
        id: 'rec-1',
        type: 'diversity',
        priority: 'high',
        title: '학습 스타일 다양성 부족',
        description: `팀 내 학습 스타일이 Visual(${learningStyleDistribution.visual}%)에 치중되어 있습니다.`,
        evidence: `Auditory(${learningStyleDistribution.auditory}%), Reading(${learningStyleDistribution.reading}%), Kinesthetic(${learningStyleDistribution.kinesthetic}%) 선생님 추가가 필요합니다.`,
        actionItems: [
          'Auditory 또는 Kinesthetic 스타일 선생님 채용',
          '기존 선생님들의 학습 스타일 파악 강화',
        ],
      })
    }
  }

  if (sajuElementsDistribution.deficient.length > 0) {
    recommendations.push({
      id: 'rec-2',
      type: 'balance',
      priority: 'medium',
      title: '사주 오행 균형 개선',
      description: `사주 오행 분석 결과 ${sajuElementsDistribution.deficient.join(', ')} 오행이 부족합니다.`,
      evidence: `주요 오행: ${sajuElementsDistribution.dominant} (${sajuElementsDistribution.dominant === '목' ? sajuElementsDistribution.wood :
        sajuElementsDistribution.dominant === '화' ? sajuElementsDistribution.fire :
        sajuElementsDistribution.dominant === '토' ? sajuElementsDistribution.earth :
        sajuElementsDistribution.dominant === '금' ? sajuElementsDistribution.metal :
        sajuElementsDistribution.water}%)`,
      actionItems: [
        '부족한 오행 선생님 채용 고려',
        '오행 균형을 고려한 팀 구성 재검토',
      ],
    })
  }

  if (expertiseCoverage.weakSubjects.length > 0) {
    recommendations.push({
      id: 'rec-3',
      type: 'coverage',
      priority: 'high',
      title: '전문성 커버리지 강화',
      description: `과목별 전문성이 고르지 않습니다. ${expertiseCoverage.weakSubjects.join(', ')} 과목 커버리지가 부족합니다.`,
      evidence: `과목별 선생님: ${Object.entries(expertiseCoverage.subjects).map(([s, c]) => `${s}(${c}명)`).join(', ')}`,
      actionItems: [
        '취약 과목 전문 선생님 채용',
        '기존 선생님들의 과목 전문성 개발',
      ],
    })
  }

  if (expertiseCoverage.weakGrades.length > 0) {
    recommendations.push({
      id: 'rec-4',
      type: 'coverage',
      priority: 'medium',
      title: '학년별 커버리지 개선',
      description: `${expertiseCoverage.weakGrades.join(', ')} 학년 커버리지가 부족합니다.`,
      evidence: `학년별 선생님: ${Object.entries(expertiseCoverage.grades).map(([g, c]) => `${g}(${c}명)`).join(', ')}`,
      actionItems: [
        '취약 학년 전문 선생님 배정',
        '학년 간 균형 있는 선생님 배치',
      ],
    })
  }

  if (diversityScore.overall < 50) {
    recommendations.push({
      id: 'rec-5',
      type: 'diversity',
      priority: 'medium',
      title: '다양성 점수 개선 필요',
      description: `팀 전체 다양성 점수가 ${diversityScore.overall}점으로 낮습니다.`,
      evidence: `항목별 점수: MBTI(${diversityScore.mbtiDiversity}), 학습 스타일(${diversityScore.learningStyleDiversity}), 오행(${diversityScore.sajuElementsDiversity}), 과목(${diversityScore.subjectDiversity}), 학년(${diversityScore.gradeDiversity})`,
      actionItems: [
        '성향이 다양한 선생님 채용',
        '기존 팀원 간 교류 강화',
      ],
    })
  }

  if (diversityScore.overall >= 70) {
    recommendations.push({
      id: 'rec-6',
      type: 'balance',
      priority: 'low',
      title: '팀 균형 우수',
      description: `팀의 다양성과 균형이 우수합니다.`,
      evidence: `다양성 점수: ${diversityScore.overall}점`,
      actionItems: [
        '현재 균형 유지',
        '우수 사례 다른 팀과 공유',
      ],
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}
