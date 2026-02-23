export type ZodiacSign = {
  key: string
  name: string
  symbol: string
  element: string
  elementName: string
  rulingPlanet: string
  dateRange: string
  traits: string[]
  strengths: string[]
  weaknesses: string[]
  learningStyle: string
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    key: "capricorn", name: "염소자리", symbol: "♑", element: "earth", elementName: "흙",
    rulingPlanet: "토성", dateRange: "12/22~1/19",
    traits: ["책임감", "인내심", "현실적", "야망"],
    strengths: ["계획적인 학습", "장기 목표 달성력", "자기 관리"],
    weaknesses: ["완벽주의 경향", "휴식 부족", "유연성 부족"],
    learningStyle: "체계적이고 단계적인 학습을 선호하며, 장기 계획에 강합니다.",
  },
  {
    key: "aquarius", name: "물병자리", symbol: "♒", element: "air", elementName: "바람",
    rulingPlanet: "천왕성", dateRange: "1/20~2/18",
    traits: ["독창성", "자유로움", "혁신적", "인도주의"],
    strengths: ["창의적 문제 해결", "독립적 탐구", "새로운 시각"],
    weaknesses: ["집중력 분산", "규칙 거부감", "감정 표현 부족"],
    learningStyle: "독창적이고 실험적인 방법을 선호하며, 틀에 박힌 학습을 싫어합니다.",
  },
  {
    key: "pisces", name: "물고기자리", symbol: "♓", element: "water", elementName: "물",
    rulingPlanet: "해왕성", dateRange: "2/19~3/20",
    traits: ["직관적", "감수성", "상상력", "공감 능력"],
    strengths: ["예술적 감각", "깊은 이해력", "공감 기반 학습"],
    weaknesses: ["현실 감각 부족", "우유부단", "감정에 좌우됨"],
    learningStyle: "감성적이고 직관적인 학습을 선호하며, 스토리텔링에 강합니다.",
  },
  {
    key: "aries", name: "양자리", symbol: "♈", element: "fire", elementName: "불",
    rulingPlanet: "화성", dateRange: "3/21~4/19",
    traits: ["리더십", "용기", "열정", "도전정신"],
    strengths: ["빠른 행동력", "경쟁에서 강함", "새로운 시작"],
    weaknesses: ["인내심 부족", "충동적 판단", "마무리 약함"],
    learningStyle: "도전적이고 경쟁적인 환경에서 동기가 부여되며, 단기 목표에 강합니다.",
  },
  {
    key: "taurus", name: "황소자리", symbol: "♉", element: "earth", elementName: "흙",
    rulingPlanet: "금성", dateRange: "4/20~5/20",
    traits: ["안정", "끈기", "실용적", "감각적"],
    strengths: ["꾸준한 노력", "현실적 계획", "집중력"],
    weaknesses: ["변화 거부", "고집", "새로운 방법 수용 느림"],
    learningStyle: "반복적이고 꾸준한 학습에 강하며, 편안한 환경에서 최선을 발휘합니다.",
  },
  {
    key: "gemini", name: "쌍둥이자리", symbol: "♊", element: "air", elementName: "바람",
    rulingPlanet: "수성", dateRange: "5/21~6/21",
    traits: ["다재다능", "호기심", "소통 능력", "적응력"],
    strengths: ["빠른 이해력", "다양한 관심사", "언어 능력"],
    weaknesses: ["집중력 분산", "깊이 부족", "일관성 부족"],
    learningStyle: "다양한 과목을 빠르게 흡수하며, 토론과 그룹 활동에서 빛납니다.",
  },
  {
    key: "cancer", name: "게자리", symbol: "♋", element: "water", elementName: "물",
    rulingPlanet: "달", dateRange: "6/22~7/22",
    traits: ["감수성", "보호본능", "기억력", "직감"],
    strengths: ["감정 기반 기억력", "세심한 관찰", "안정적 환경에서 강함"],
    weaknesses: ["감정 기복", "변화에 민감", "자기 보호 과잉"],
    learningStyle: "정서적으로 안정된 환경에서 학습 효율이 높으며, 역사/문학에 강합니다.",
  },
  {
    key: "leo", name: "사자자리", symbol: "♌", element: "fire", elementName: "불",
    rulingPlanet: "태양", dateRange: "7/23~8/22",
    traits: ["자신감", "창의성", "리더십", "관대함"],
    strengths: ["발표/프레젠테이션", "리더 역할", "열정적 학습"],
    weaknesses: ["자존심 과잉", "비판 수용 어려움", "주목받지 못하면 의욕 저하"],
    learningStyle: "인정받을 때 동기가 부여되며, 창의적 프로젝트에서 실력을 발휘합니다.",
  },
  {
    key: "virgo", name: "처녀자리", symbol: "♍", element: "earth", elementName: "흙",
    rulingPlanet: "수성", dateRange: "8/23~9/22",
    traits: ["분석력", "꼼꼼함", "실용적", "봉사정신"],
    strengths: ["체계적 정리", "디테일 관리", "논리적 분석"],
    weaknesses: ["완벽주의", "자기 비판", "융통성 부족"],
    learningStyle: "체계적이고 분석적인 학습을 선호하며, 노트 정리와 계획에 뛰어납니다.",
  },
  {
    key: "libra", name: "천칭자리", symbol: "♎", element: "air", elementName: "바람",
    rulingPlanet: "금성", dateRange: "9/23~10/22",
    traits: ["균형감", "사교성", "공정함", "미적 감각"],
    strengths: ["협동 학습", "갈등 중재", "균형 잡힌 시각"],
    weaknesses: ["우유부단", "갈등 회피", "타인 의존"],
    learningStyle: "함께 공부할 때 효과적이며, 토론과 비교 분석에 강합니다.",
  },
  {
    key: "scorpio", name: "전갈자리", symbol: "♏", element: "water", elementName: "물",
    rulingPlanet: "명왕성", dateRange: "10/23~11/21",
    traits: ["집중력", "통찰력", "결단력", "열정"],
    strengths: ["깊은 집중력", "문제 해결 능력", "끝까지 파고드는 힘"],
    weaknesses: ["집착 경향", "의심 과다", "감정 폭발"],
    learningStyle: "한 분야를 깊이 파고들며, 미스터리나 연구 과제에서 빛을 발합니다.",
  },
  {
    key: "sagittarius", name: "궁수자리", symbol: "♐", element: "fire", elementName: "불",
    rulingPlanet: "목성", dateRange: "11/22~12/21",
    traits: ["모험심", "낙관적", "철학적", "자유로움"],
    strengths: ["넓은 시야", "외국어/문화 관심", "빠른 습득"],
    weaknesses: ["깊이 부족", "약속 이행 어려움", "과대 목표"],
    learningStyle: "탐험적이고 자유로운 학습을 선호하며, 큰 그림을 먼저 이해합니다.",
  },
]

const ZODIAC_BOUNDARIES: Array<{ month: number; day: number; index: number }> = [
  { month: 1, day: 20, index: 1 },
  { month: 2, day: 19, index: 2 },
  { month: 3, day: 21, index: 3 },
  { month: 4, day: 20, index: 4 },
  { month: 5, day: 21, index: 5 },
  { month: 6, day: 22, index: 6 },
  { month: 7, day: 23, index: 7 },
  { month: 8, day: 23, index: 8 },
  { month: 9, day: 23, index: 9 },
  { month: 10, day: 23, index: 10 },
  { month: 11, day: 22, index: 11 },
  { month: 12, day: 22, index: 0 },
]

export function getZodiacSign(birthDate: Date): ZodiacSign {
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()

  for (let i = ZODIAC_BOUNDARIES.length - 1; i >= 0; i--) {
    const boundary = ZODIAC_BOUNDARIES[i]
    if (month > boundary.month || (month === boundary.month && day >= boundary.day)) {
      return ZODIAC_SIGNS[boundary.index]
    }
  }

  return ZODIAC_SIGNS[0]
}

export function getAllZodiacSigns(): ZodiacSign[] {
  return [...ZODIAC_SIGNS]
}
