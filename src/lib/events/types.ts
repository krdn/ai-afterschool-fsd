export type AnalysisCompleteEvent = {
  type: 'analysis:complete'
  analysisType: 'saju' | 'mbti' | 'vark' | 'face' | 'palm' | 'name' | 'zodiac'
  subjectType: 'STUDENT' | 'TEACHER'
  subjectId: string
  subjectName: string
  timestamp: string
}

export type ServerEvent = AnalysisCompleteEvent
