/**
 * E2E 테스트용 시드 데이터 (고정 ID 불필요 — runSeed가 DB에 삽입)
 *
 * prisma/seed-test.ts에서 추출한 3명 선생님, 5명 학생, 2명 학부모 데이터입니다.
 * 비밀번호는 평문 "test1234"이며 runSeed 실행 시 해시됩니다.
 */

import type { SeedDataSet } from "./constants"
import type { SeedTeacher, SeedStudent, SeedParent } from "./data"

const teachers: SeedTeacher[] = [
  {
    email: "admin@test.com",
    name: "관리자",
    password: "test1234",
    phone: "010-9999-9999",
    role: "DIRECTOR",
    teamName: null,
    birthDate: "1980-01-01",
    birthTimeHour: 12,
    birthTimeMinute: 0,
    nameHanja: null,
    imagePath: null,
  },
  {
    email: "teacher1@test.com",
    name: "김선생",
    password: "test1234",
    phone: "010-1111-1111",
    role: "TEACHER",
    teamName: null,
    birthDate: "1985-03-15",
    birthTimeHour: 14,
    birthTimeMinute: 30,
    nameHanja: null,
    imagePath: null,
  },
  {
    email: "teacher2@test.com",
    name: "이선생",
    password: "test1234",
    phone: "010-2222-2222",
    role: "TEACHER",
    teamName: null,
    birthDate: "1988-07-20",
    birthTimeHour: 9,
    birthTimeMinute: 15,
    nameHanja: null,
    imagePath: null,
  },
]

const students: SeedStudent[] = [
  {
    name: "홍길동",
    school: "테스트고등학교",
    grade: 1,
    birthDate: "2008-05-10",
    birthTimeHour: 8,
    birthTimeMinute: 30,
    nameHanja: null,
    phone: "010-1000-0001",
    teacherEmail: "teacher1@test.com",
    teamName: "",
    imagePath: null,
  },
  {
    name: "김영희",
    school: "테스트고등학교",
    grade: 2,
    birthDate: "2007-08-22",
    birthTimeHour: 15,
    birthTimeMinute: 45,
    nameHanja: null,
    phone: "010-1000-0002",
    teacherEmail: "teacher1@test.com",
    teamName: "",
    imagePath: null,
  },
  {
    name: "박철수",
    school: "테스트고등학교",
    grade: 3,
    birthDate: "2006-12-03",
    birthTimeHour: 11,
    birthTimeMinute: 20,
    nameHanja: null,
    phone: "010-1000-0003",
    teacherEmail: "teacher2@test.com",
    teamName: "",
    imagePath: null,
  },
  {
    name: "이민지",
    school: "테스트중학교",
    grade: 3,
    birthDate: "2009-03-18",
    birthTimeHour: 16,
    birthTimeMinute: 0,
    nameHanja: null,
    phone: "010-1000-0004",
    teacherEmail: "teacher2@test.com",
    teamName: "",
    imagePath: null,
  },
  {
    name: "최준호",
    school: "테스트고등학교",
    grade: 1,
    birthDate: "2008-09-25",
    birthTimeHour: 10,
    birthTimeMinute: 10,
    nameHanja: null,
    phone: "010-1000-0005",
    teacherEmail: "teacher1@test.com",
    teamName: "",
    imagePath: null,
  },
]

const parents: SeedParent[] = [
  {
    name: "홍아버지",
    phone: "010-2000-0001",
    relation: "FATHER",
    studentName: "홍길동",
  },
  {
    name: "김어머니",
    phone: "010-2000-0002",
    relation: "MOTHER",
    studentName: "김영희",
  },
]

export const TEST_SEED_DATA: SeedDataSet = {
  teams: [],
  teachers,
  students,
  parents,
  providers: [],
}
