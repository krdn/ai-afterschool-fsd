import type { ParentCounselingReservation } from '@/lib/db'

export type ReservationWithRelations = ParentCounselingReservation & {
  student: {
    id: string
    name: string
    school: string | null
    grade: number | null
  }
  parent: {
    id: string
    name: string
    phone: string
    email: string | null
    relation: string
  }
  teacher: {
    id: string
    name: string
  }
}
