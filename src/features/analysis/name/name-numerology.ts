import { getStrokeCount } from "./hanja-strokes"

const DOUBLE_SURNAME_ALLOWLIST = new Set([
  "남궁", "황보", "제갈", "사공", "서문",
  "선우", "독고", "동방", "어금", "공손",
])

type NameSplit = {
  surname: string
  givenName: string
  surnameLength: number
  givenNameLength: number
}

export type NameNumerologyResult = {
  split: NameSplit
  strokes: {
    perSyllable: number[]
    surname: number
    givenName: number
    total: number
  }
  grids: {
    won: number
    hyung: number
    yi: number
    jeong: number
  }
  interpretations: {
    won: string
    hyung: string
    yi: string
    jeong: string
    overall: string
  }
}

export type NameNumerologyOutcome =
  | { status: "ok"; result: NameNumerologyResult }
  | { status: "invalid-name"; message: string }
  | { status: "missing-hanja"; message: string; missingSyllables: string[] }
  | { status: "unknown-stroke"; message: string; missingHanja: string[] }

const INTERPRETATION_RANGES = [
  { max: 10, text: "기초 운이 약해 환경의 뒷받침이 필요합니다" },
  { max: 20, text: "안정과 성실이 돋보이며 꾸준함이 힘이 됩니다" },
  { max: 30, text: "도전과 성취의 기운이 있어 목표 달성에 유리합니다" },
  { max: 40, text: "책임감과 리더십이 강해 주변 신뢰를 얻습니다" },
  { max: 50, text: "활동성이 높고 대인관계에서 에너지가 빛납니다" },
  { max: 60, text: "균형감이 좋고 장기 계획에 강점을 보입니다" },
  { max: 70, text: "현실 감각과 실무 능력이 뛰어나 기반을 다집니다" },
  { max: 81, text: "완성의 기운이 강해 성취와 명예를 함께 얻습니다" },
]

function splitSyllables(name: string) {
  return Array.from(name.trim())
}

export function splitKoreanName(name: string): NameSplit | null {
  const syllables = splitSyllables(name)
  const length = syllables.length

  if (length < 2 || length > 4) return null

  if (length === 2) {
    return { surname: syllables[0], givenName: syllables[1], surnameLength: 1, givenNameLength: 1 }
  }

  if (length === 3) {
    const doubleSurname = syllables.slice(0, 2).join("")
    const isDouble = DOUBLE_SURNAME_ALLOWLIST.has(doubleSurname)
    const surnameLength = isDouble ? 2 : 1
    return {
      surname: syllables.slice(0, surnameLength).join(""),
      givenName: syllables.slice(surnameLength).join(""),
      surnameLength,
      givenNameLength: length - surnameLength,
    }
  }

  const doubleSurname = syllables.slice(0, 2).join("")
  const isDouble = DOUBLE_SURNAME_ALLOWLIST.has(doubleSurname)
  const surnameLength = isDouble ? 2 : 1
  return {
    surname: syllables.slice(0, surnameLength).join(""),
    givenName: syllables.slice(surnameLength).join(""),
    surnameLength,
    givenNameLength: length - surnameLength,
  }
}

function interpretGridValue(value: number) {
  const matched = INTERPRETATION_RANGES.find((range) => value <= range.max)
  return matched ? matched.text : "변화가 많아 꾸준한 관리가 필요합니다"
}

function deriveOverallInterpretation(grids: NameNumerologyResult["grids"]) {
  const average = Math.round((grids.won + grids.hyung + grids.yi + grids.jeong) / 4)
  return interpretGridValue(average)
}

export function calculateNameNumerology(input: {
  name: string
  hanjaName?: string | null
}): NameNumerologyOutcome {
  const name = input.name.trim()
  const split = splitKoreanName(name)

  if (!split) {
    return { status: "invalid-name", message: "이름은 2~4글자 한글로 입력해야 합니다." }
  }

  if (!input.hanjaName) {
    return { status: "missing-hanja", message: "선택된 한자가 없습니다.", missingSyllables: splitSyllables(name) }
  }

  const nameSyllables = splitSyllables(name)
  const hanjaSyllables = splitSyllables(input.hanjaName)

  if (nameSyllables.length !== hanjaSyllables.length) {
    return { status: "missing-hanja", message: "한자 선택이 이름 길이와 일치하지 않습니다.", missingSyllables: nameSyllables }
  }

  const strokes: number[] = []
  const missingHanja: string[] = []

  hanjaSyllables.forEach((hanja) => {
    const strokeCount = getStrokeCount(hanja)
    if (!strokeCount) {
      missingHanja.push(hanja)
      return
    }
    strokes.push(strokeCount)
  })

  if (missingHanja.length > 0) {
    return { status: "unknown-stroke", message: "등록되지 않은 한자 획수가 포함되어 있습니다.", missingHanja }
  }

  const surnameStrokes = strokes.slice(0, split.surnameLength).reduce((sum, value) => sum + value, 0)
  const givenStrokes = strokes.slice(split.surnameLength).reduce((sum, value) => sum + value, 0)
  const totalStrokes = surnameStrokes + givenStrokes

  const won = strokes[0] + strokes[strokes.length - 1]
  const hyung = surnameStrokes + strokes[split.surnameLength]
  const yi = givenStrokes
  const jeong = totalStrokes

  const interpretations = {
    won: interpretGridValue(won),
    hyung: interpretGridValue(hyung),
    yi: interpretGridValue(yi),
    jeong: interpretGridValue(jeong),
    overall: deriveOverallInterpretation({ won, hyung, yi, jeong }),
  }

  return {
    status: "ok",
    result: {
      split,
      strokes: { perSyllable: strokes, surname: surnameStrokes, givenName: givenStrokes, total: totalStrokes },
      grids: { won, hyung, yi, jeong },
      interpretations,
    },
  }
}

export function generateNameInterpretation(result: NameNumerologyResult) {
  const { split, strokes, grids, interpretations } = result
  return [
    `성명학 기준으로 ${split.surname}${split.givenName}의 한자 획수 합은 ${strokes.total}획입니다.`,
    `원격 ${grids.won}은 ${interpretations.won}.`,
    `형격 ${grids.hyung}은 ${interpretations.hyung}.`,
    `이격 ${grids.yi}은 ${interpretations.yi}.`,
    `정격 ${grids.jeong}은 ${interpretations.jeong}.`,
    `전체적으로는 ${interpretations.overall}.`,
    "성명학 해석은 참고용이며 학생의 노력과 환경이 결과에 큰 영향을 줍니다.",
  ].join(" ")
}
