// Canonical source: @/lib/validations/students
// shared 레이어에서 접근이 필요한 경우를 위한 re-export
export {
  CreateStudentSchema,
  UpdateStudentSchema,
  HanjaSelectionSchema,
  NameHanjaSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
  type NameHanjaInput,
} from "@/lib/validations/students"
