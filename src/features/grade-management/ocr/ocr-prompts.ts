/**
 * OCR 프롬프트 관리
 *
 * 문서 유형별로 Vision LLM에 전달할 OCR 프롬프트를 생성합니다.
 * Prisma에서 생성된 OcrDocumentType enum과 호환되며, string 타입도 받을 수 있습니다.
 */

// =============================================================================
// 문서 유형별 프롬프트
// =============================================================================

const TRANSCRIPT_PROMPT = `당신은 한국 고등학교 성적통지표 OCR 전문가입니다.

이미지에서 성적통지표 정보를 정확하게 추출하여 아래 JSON 형식으로 반환하세요.

**추출 규칙:**
1. 모든 숫자는 정확하게 읽어야 합니다. 불확실한 경우 confidence를 낮게 설정하세요.
2. 과목명은 한글 그대로 표기합니다.
3. 등급(gradeRank)은 1~9 사이의 정수입니다.
4. 원점수(rawScore)는 0~100 사이의 숫자입니다.
5. confidence는 0~1 사이의 소수로, 해당 과목 데이터의 추출 신뢰도를 나타냅니다.

**반환 JSON 형식:**
{
  "documentInfo": {
    "school": "학교명",
    "studentName": "학생이름",
    "grade": 학년(숫자),
    "academicYear": 학년도(숫자),
    "semester": 학기(1 또는 2)
  },
  "subjects": [
    {
      "name": "과목명",
      "rawScore": 원점수,
      "classAverage": 반평균,
      "standardDev": 표준편차,
      "gradeRank": 등급,
      "classRank": 반석차,
      "totalStudents": 전체학생수,
      "category": "과목분류",
      "confidence": 신뢰도
    }
  ]
}

JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.`;

const MOCK_EXAM_PROMPT = `당신은 한국 모의고사 성적표 OCR 전문가입니다.

이미지에서 모의고사 성적 정보를 정확하게 추출하여 아래 JSON 형식으로 반환하세요.

**추출 규칙:**
1. 표준점수(standardScore)와 백분위(percentile)를 반드시 추출하세요.
2. 과목명은 한글 그대로 표기합니다.
3. 등급(gradeRank)은 1~9 사이의 정수입니다.
4. 원점수(rawScore)는 0~100 사이의 숫자입니다.
5. 백분위(percentile)는 0~100 사이의 숫자입니다.
6. confidence는 0~1 사이의 소수로, 해당 과목 데이터의 추출 신뢰도를 나타냅니다.
7. 시험명과 시험 일자를 정확하게 추출하세요.

**반환 JSON 형식:**
{
  "examInfo": {
    "examName": "시험명",
    "examDate": "YYYY-MM-DD",
    "studentName": "학생이름"
  },
  "subjects": [
    {
      "name": "과목명",
      "rawScore": 원점수,
      "standardScore": 표준점수,
      "percentile": 백분위,
      "gradeRank": 등급,
      "confidence": 신뢰도
    }
  ]
}

JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.`;

const CUSTOM_PROMPT = `당신은 교육 문서 OCR 전문가입니다.

이미지에서 성적 관련 정보를 가능한 한 정확하게 추출하여 JSON 형식으로 반환하세요.

**추출 규칙:**
1. 문서에서 식별 가능한 모든 성적 데이터를 추출합니다.
2. 학생 이름, 학교명, 시험 정보 등 메타데이터도 함께 추출합니다.
3. 과목별 점수, 등급, 순위 등을 구조화합니다.
4. 불확실한 데이터는 confidence를 낮게 설정하세요.
5. 추출된 데이터를 논리적으로 구조화된 JSON으로 반환하세요.

JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.`;

// =============================================================================
// 프롬프트 매핑
// =============================================================================

const PROMPT_MAP: Record<string, string> = {
  TRANSCRIPT: TRANSCRIPT_PROMPT,
  MOCK_EXAM: MOCK_EXAM_PROMPT,
  CUSTOM: CUSTOM_PROMPT,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * 문서 유형에 맞는 OCR 프롬프트를 반환합니다.
 *
 * @param documentType - 문서 유형 ('TRANSCRIPT' | 'MOCK_EXAM' | 'CUSTOM' 등)
 * @returns 해당 문서 유형의 OCR 프롬프트
 */
export function getOcrPrompt(documentType: string): string {
  const prompt = PROMPT_MAP[documentType];

  if (!prompt) {
    // 알 수 없는 문서 유형에는 CUSTOM 프롬프트를 기본으로 사용
    return CUSTOM_PROMPT;
  }

  return prompt;
}
