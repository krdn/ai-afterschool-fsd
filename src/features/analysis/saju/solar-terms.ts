export type SolarTermName =
  | "입춘"
  | "우수"
  | "경칩"
  | "춘분"
  | "청명"
  | "곡우"
  | "입하"
  | "소만"
  | "망종"
  | "하지"
  | "소서"
  | "대서"
  | "입추"
  | "처서"
  | "백로"
  | "추분"
  | "한로"
  | "상강"
  | "입동"
  | "소설"
  | "대설"
  | "동지"
  | "소한"
  | "대한"

export type SolarTermEntry = {
  name: SolarTermName
  at: Date
}

const TERM_ORDER: SolarTermName[] = [
  "입춘", "우수", "경칩", "춘분", "청명", "곡우",
  "입하", "소만", "망종", "하지", "소서", "대서",
  "입추", "처서", "백로", "추분", "한로", "상강",
  "입동", "소설", "대설", "동지", "소한", "대한",
]

const APPROXIMATE_DATES: Record<SolarTermName, { month: number; day: number }> = {
  입춘: { month: 2, day: 4 },
  우수: { month: 2, day: 19 },
  경칩: { month: 3, day: 6 },
  춘분: { month: 3, day: 21 },
  청명: { month: 4, day: 5 },
  곡우: { month: 4, day: 20 },
  입하: { month: 5, day: 6 },
  소만: { month: 5, day: 21 },
  망종: { month: 6, day: 6 },
  하지: { month: 6, day: 21 },
  소서: { month: 7, day: 7 },
  대서: { month: 7, day: 23 },
  입추: { month: 8, day: 8 },
  처서: { month: 8, day: 23 },
  백로: { month: 9, day: 8 },
  추분: { month: 9, day: 23 },
  한로: { month: 10, day: 8 },
  상강: { month: 10, day: 23 },
  입동: { month: 11, day: 7 },
  소설: { month: 11, day: 22 },
  대설: { month: 12, day: 7 },
  동지: { month: 12, day: 22 },
  소한: { month: 1, day: 5 },
  대한: { month: 1, day: 20 },
}

const SOLAR_TERMS_BY_YEAR: Record<number, SolarTermEntry[]> = {
  1984: [
    { name: "입춘", at: new Date("1984-02-04T10:40:00+09:00") },
    { name: "우수", at: new Date("1984-02-19T06:49:00+09:00") },
    { name: "경칩", at: new Date("1984-03-05T22:28:00+09:00") },
    { name: "춘분", at: new Date("1984-03-20T23:23:00+09:00") },
    { name: "청명", at: new Date("1984-04-04T15:03:00+09:00") },
    { name: "곡우", at: new Date("1984-04-20T09:40:00+09:00") },
    { name: "입하", at: new Date("1984-05-05T08:52:00+09:00") },
    { name: "소만", at: new Date("1984-05-21T01:17:00+09:00") },
    { name: "망종", at: new Date("1984-06-05T19:33:00+09:00") },
    { name: "하지", at: new Date("1984-06-21T12:50:00+09:00") },
    { name: "소서", at: new Date("1984-07-07T06:13:00+09:00") },
    { name: "대서", at: new Date("1984-07-23T00:32:00+09:00") },
    { name: "입추", at: new Date("1984-08-07T18:50:00+09:00") },
    { name: "처서", at: new Date("1984-08-23T10:16:00+09:00") },
    { name: "백로", at: new Date("1984-09-07T22:08:00+09:00") },
    { name: "추분", at: new Date("1984-09-23T07:15:00+09:00") },
    { name: "한로", at: new Date("1984-10-08T13:32:00+09:00") },
    { name: "상강", at: new Date("1984-10-23T16:48:00+09:00") },
    { name: "입동", at: new Date("1984-11-07T16:05:00+09:00") },
    { name: "소설", at: new Date("1984-11-22T13:21:00+09:00") },
    { name: "대설", at: new Date("1984-12-07T08:40:00+09:00") },
    { name: "동지", at: new Date("1984-12-22T02:10:00+09:00") },
    { name: "소한", at: new Date("1985-01-05T20:25:00+09:00") },
    { name: "대한", at: new Date("1985-01-20T14:52:00+09:00") },
  ],
  1988: [
    { name: "입춘", at: new Date("1988-02-04T12:24:00+09:00") },
    { name: "우수", at: new Date("1988-02-19T08:30:00+09:00") },
    { name: "경칩", at: new Date("1988-03-05T00:04:00+09:00") },
    { name: "춘분", at: new Date("1988-03-20T18:44:00+09:00") },
    { name: "청명", at: new Date("1988-04-04T10:21:00+09:00") },
    { name: "곡우", at: new Date("1988-04-20T04:52:00+09:00") },
    { name: "입하", at: new Date("1988-05-05T04:07:00+09:00") },
    { name: "소만", at: new Date("1988-05-20T20:38:00+09:00") },
    { name: "망종", at: new Date("1988-06-05T14:58:00+09:00") },
    { name: "하지", at: new Date("1988-06-21T08:26:00+09:00") },
    { name: "소서", at: new Date("1988-07-07T01:52:00+09:00") },
    { name: "대서", at: new Date("1988-07-22T20:12:00+09:00") },
    { name: "입추", at: new Date("1988-08-07T14:33:00+09:00") },
    { name: "처서", at: new Date("1988-08-23T05:54:00+09:00") },
    { name: "백로", at: new Date("1988-09-07T17:51:00+09:00") },
    { name: "추분", at: new Date("1988-09-22T22:18:00+09:00") },
    { name: "한로", at: new Date("1988-10-08T04:36:00+09:00") },
    { name: "상강", at: new Date("1988-10-23T07:54:00+09:00") },
    { name: "입동", at: new Date("1988-11-07T07:12:00+09:00") },
    { name: "소설", at: new Date("1988-11-22T04:36:00+09:00") },
    { name: "대설", at: new Date("1988-12-06T23:50:00+09:00") },
    { name: "동지", at: new Date("1988-12-21T17:25:00+09:00") },
    { name: "소한", at: new Date("1989-01-05T11:36:00+09:00") },
    { name: "대한", at: new Date("1989-01-20T06:03:00+09:00") },
  ],
  1995: [
    { name: "입춘", at: new Date("1995-02-04T12:10:00+09:00") },
    { name: "우수", at: new Date("1995-02-19T08:09:00+09:00") },
    { name: "경칩", at: new Date("1995-03-05T23:43:00+09:00") },
    { name: "춘분", at: new Date("1995-03-20T17:33:00+09:00") },
    { name: "청명", at: new Date("1995-04-04T10:59:00+09:00") },
    { name: "곡우", at: new Date("1995-04-20T04:24:00+09:00") },
    { name: "입하", at: new Date("1995-05-05T03:24:00+09:00") },
    { name: "소만", at: new Date("1995-05-20T19:49:00+09:00") },
    { name: "망종", at: new Date("1995-06-05T14:05:00+09:00") },
    { name: "하지", at: new Date("1995-06-21T07:24:00+09:00") },
    { name: "소서", at: new Date("1995-07-07T00:44:00+09:00") },
    { name: "대서", at: new Date("1995-07-22T19:05:00+09:00") },
    { name: "입추", at: new Date("1995-08-07T13:22:00+09:00") },
    { name: "처서", at: new Date("1995-08-23T04:45:00+09:00") },
    { name: "백로", at: new Date("1995-09-07T16:29:00+09:00") },
    { name: "추분", at: new Date("1995-09-22T20:57:00+09:00") },
    { name: "한로", at: new Date("1995-10-08T03:10:00+09:00") },
    { name: "상강", at: new Date("1995-10-23T06:30:00+09:00") },
    { name: "입동", at: new Date("1995-11-07T05:48:00+09:00") },
    { name: "소설", at: new Date("1995-11-22T03:12:00+09:00") },
    { name: "대설", at: new Date("1995-12-06T22:33:00+09:00") },
    { name: "동지", at: new Date("1995-12-21T16:13:00+09:00") },
    { name: "소한", at: new Date("1996-01-05T10:10:00+09:00") },
    { name: "대한", at: new Date("1996-01-20T04:40:00+09:00") },
  ],
}

function buildApproximateSolarTerms(year: number): SolarTermEntry[] {
  return TERM_ORDER.map((term) => {
    const { month, day } = APPROXIMATE_DATES[term]
    const termYear = month === 1 ? year + 1 : year
    const iso = `${termYear}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}T00:00:00+09:00`
    return { name: term, at: new Date(iso) }
  })
}

export function getSolarTermsForYear(year: number): SolarTermEntry[] {
  const entries = SOLAR_TERMS_BY_YEAR[year]
  if (entries) return entries.map((entry) => ({ ...entry }))
  return buildApproximateSolarTerms(year)
}

export function getSolarTerm(year: number, name: SolarTermName): SolarTermEntry {
  const terms = getSolarTermsForYear(year)
  const match = terms.find((term) => term.name === name)
  if (!match) {
    return { name, at: new Date("1970-01-01T00:00:00+09:00") }
  }
  return match
}

export function getSolarTermIndex(
  year: number,
  kstTimestamp: number
): { index: number; term: SolarTermEntry } {
  const terms = getSolarTermsForYear(year)
  let index = 0

  for (let i = 0; i < terms.length; i += 1) {
    if (kstTimestamp >= terms[i].at.getTime()) {
      index = i
    } else {
      break
    }
  }

  return { index, term: terms[index] }
}

export function listSolarTerms(): SolarTermName[] {
  return TERM_ORDER.slice()
}
