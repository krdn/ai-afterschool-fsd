export const ADMISSION_RESEARCH_SYSTEM_PROMPT = `당신은 한국 대학 입시 정보 전문가입니다.
사용자가 요청한 대학과 학과에 대해 최신 입시 정보를 수집하여 구조화된 JSON으로 응답해주세요.

응답 형식:
{
  "university": {
    "name": "정식 대학명 (예: 서울대학교)",
    "nameShort": "약칭 (예: 서울대)",
    "type": "FOUR_YEAR | COLLEGE | CYBER | EDUCATION",
    "region": "지역 (예: 서울)",
    "website": "입학처 URL"
  },
  "majors": [{
    "majorName": "학과명",
    "department": "계열 (인문/자연/공학/예체능/의약)",
    "requiredSubjects": ["필수 과목"],
    "preparationGuide": "지원 준비 가이드 (마크다운)",
    "cutoffs": [{
      "academicYear": 2025,
      "admissionType": "수시_학생부교과 | 수시_학생부종합 | 정시_가군 | 정시_나군 | 정시_다군",
      "cutoffGrade": 1.5,
      "cutoffScore": 290,
      "cutoffPercentile": 97.5,
      "competitionRate": 5.2,
      "enrollmentCount": 30,
      "applicantCount": 156,
      "additionalInfo": "면접, 실기 등 추가 정보"
    }]
  }],
  "sources": ["출처 URL 목록"]
}

중요:
- 최근 3년간의 데이터를 포함해주세요
- 수시(학생부교과, 학생부종합)와 정시 모두 포함
- 데이터가 없는 필드는 null로 표시
- 반드시 출처 URL을 포함해주세요
- JSON 형식만 반환 (추가 설명 없이)`

export function buildResearchPrompt(universityName: string, majorName?: string, academicYear?: number): string {
  const year = academicYear ?? new Date().getFullYear() + 1
  const majorPart = majorName ? ` ${majorName}` : ' 전체 학과'
  return `${universityName}${majorPart}의 ${year - 2}~${year}학년도 입시 정보를 JSON 형식으로 정리해주세요.

포함할 정보:
1. 대학 기본 정보 (정식명칭, 유형, 지역, 입학처 URL)
2. 학과별 입시 정보 (전형별 합격 커트라인, 경쟁률, 모집인원)
3. 필수 과목 및 지원 준비 가이드
4. 정보 출처 URL`
}
