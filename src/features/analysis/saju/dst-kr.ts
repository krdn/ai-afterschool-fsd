export type KoreaDstPeriod = {
  start: string
  end: string
  label: string
}

const KOREA_DST_PERIODS: KoreaDstPeriod[] = [
  {
    label: "1948",
    start: "1948-06-01T00:00:00+09:00",
    end: "1948-09-13T00:00:00+09:00",
  },
  {
    label: "1955",
    start: "1955-05-05T00:00:00+09:00",
    end: "1955-09-09T00:00:00+09:00",
  },
  {
    label: "1956",
    start: "1956-05-20T00:00:00+09:00",
    end: "1956-09-30T00:00:00+09:00",
  },
  {
    label: "1957",
    start: "1957-05-19T00:00:00+09:00",
    end: "1957-09-29T00:00:00+09:00",
  },
  {
    label: "1958",
    start: "1958-05-04T00:00:00+09:00",
    end: "1958-09-21T00:00:00+09:00",
  },
  {
    label: "1959",
    start: "1959-05-03T00:00:00+09:00",
    end: "1959-09-20T00:00:00+09:00",
  },
  {
    label: "1960",
    start: "1960-05-15T00:00:00+09:00",
    end: "1960-09-18T00:00:00+09:00",
  },
  {
    label: "1987",
    start: "1987-05-10T00:00:00+09:00",
    end: "1987-10-11T00:00:00+09:00",
  },
  {
    label: "1988",
    start: "1988-05-08T00:00:00+09:00",
    end: "1988-10-09T00:00:00+09:00",
  },
]

export function isKoreaDST(kstTimestamp: number) {
  return KOREA_DST_PERIODS.some((period) => {
    const start = Date.parse(period.start)
    const end = Date.parse(period.end)
    return kstTimestamp >= start && kstTimestamp < end
  })
}

export function getKoreaDstOffsetMinutes(kstTimestamp: number) {
  return isKoreaDST(kstTimestamp) ? -60 : 0
}

export function listKoreaDstPeriods() {
  return KOREA_DST_PERIODS.slice()
}
