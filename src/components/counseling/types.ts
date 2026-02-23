// 상담 기록 타입
export interface CounselingSessionData {
  id: string
  student: {
    id: string
    name: string
    school: string | null
    grade: number | null
  }
  teacher: {
    id: string
    name: string
    role: string
  }
  sessionDate: Date
  duration: number
  type: string
  summary: string
  followUpRequired: boolean
  followUpDate: Date | null
}
