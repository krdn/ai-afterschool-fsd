"use client"

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createTeacher, updateTeacher, type TeacherFormState } from "@/lib/actions/teacher/crud"
import { TeacherSchema } from "@/lib/validations/teachers"
import {
  StudentImageUploader,
  type StudentImagePayload,
} from "@/components/students/student-image-uploader"
import { coerceHanjaSelections } from "@/features/analysis/name"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TeacherData = {
  id: string
  name: string
  email: string
  role: 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'
  teamId: string | null
  phone: string | null
  birthDate: Date | null
  nameHanja: unknown
  birthTimeHour: number | null
  birthTimeMinute: number | null
  profileImage: string | null
  profileImagePublicId: string | null
}

type TeacherFormProps = {
  teams?: Array<{ id: string; name: string }>
  teacher?: TeacherData
  currentRole?: 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'
}

type TeacherFormValues = z.infer<typeof TeacherSchema>

export function TeacherForm({ teams = [], teacher, currentRole }: TeacherFormProps) {
  const isEdit = !!teacher
  const showRoleFields = currentRole === 'DIRECTOR'

  const [profileImage, setProfileImage] = useState<StudentImagePayload | null>(
    teacher?.profileImage && teacher?.profileImagePublicId
      ? {
        type: "profile",
        originalUrl: teacher.profileImage,
        publicId: teacher.profileImagePublicId,
      }
      : null
  )

  const [profileRemoved, setProfileRemoved] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  // 기존 한자 데이터에서 텍스트 추출
  const [nameHanjaText, setNameHanjaText] = useState(() => {
    const selections = coerceHanjaSelections(teacher?.nameHanja)
    if (!selections) return ""
    return selections.map((s) => s.hanja ?? "").join("")
  })

  const formRef = useRef<HTMLFormElement>(null)

  const action = isEdit
    ? updateTeacher.bind(null, teacher.id)
    : createTeacher

  const [state, formAction, pending] = useActionState<TeacherFormState, FormData>(
    action,
    { errors: {} }
  )

  // 폼 에러 발생 시 토스트 표시
  const prevErrorRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const errorMessage = state?.errors?._form?.[0]
    if (errorMessage && errorMessage !== prevErrorRef.current) {
      toast.error(errorMessage, { id: "teacher-form-submit" })
      prevErrorRef.current = errorMessage
    }
  }, [state?.errors?._form])

  // pending이 끝났지만 에러가 없으면 로딩 토스트 닫기
  useEffect(() => {
    if (!pending && !state?.errors?._form) {
      toast.dismiss("teacher-form-submit")
    }
  }, [pending, state?.errors?._form])

  // 언마운트 시 로딩 토스트 정리 (redirect로 페이지 전환 시 pending이 false로 돌아오지 않는 문제 방지)
  useEffect(() => {
    return () => {
      toast.dismiss("teacher-form-submit")
    }
  }, [])

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    const d = new Date(date)
    return d.toISOString().split("T")[0]
  }

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(TeacherSchema),
    defaultValues: {
      name: teacher?.name ?? "",
      email: teacher?.email ?? "",
      role: teacher?.role ?? "TEACHER",
      teamId: teacher?.teamId ?? null,
      phone: teacher?.phone ?? "",
      birthDate: formatDate(teacher?.birthDate ?? null),
      nameHanja: "",
    },
    mode: "onChange",
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 클라이언트 검증 실행
    form.handleSubmit(() => {
      const formElement = formRef.current
      if (!formElement) return

      const formData = new FormData(formElement)

      // nameHanja를 학생 폼과 동일한 방식으로 JSON 변환
      const name = formData.get("name") as string
      const hanja = nameHanjaText.trim()
      if (name && hanja) {
        const syllables = Array.from(name.trim())
        const hanjaChars = Array.from(hanja)
        const selections = syllables.map((s, i) => ({
          syllable: s,
          hanja: hanjaChars[i] ?? null,
        }))
        formData.set("nameHanja", JSON.stringify(selections))
      }

      // 제출 시작 토스트 표시
      toast.loading(isEdit ? "수정 중..." : "선생님 등록 중...", { id: "teacher-form-submit" })

      startTransition(() => {
        formAction(formData)
      })
    })()
  }

  const uploadFolder = teacher?.id
    ? `teachers/${teacher.id}/profile`
    : `teachers/new/profile`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "선생님 정보 수정" : "선생님 등록"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {state?.errors?._form && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
              {state.errors._form[0]}
            </div>
          )}

          {!isEdit && (
            <div className="p-3 rounded-md bg-blue-50 text-blue-700 text-sm">
              기본 비밀번호(afterschool2026!)가 자동 설정됩니다. 첫 로그인 후 변경해주세요.
            </div>
          )}

          {/* 프로필 사진 - 학생과 동일한 Cloudinary 업로더 */}
          <div className="space-y-4">
            <input type="hidden" name="profileImage" value={profileImage?.originalUrl ?? ""} />
            <input type="hidden" name="profileImagePublicId" value={profileImage?.publicId ?? ""} />

            <StudentImageUploader
              type="profile"
              label="프로필 사진"
              description="선생님의 프로필 사진을 업로드해주세요"
              folder={uploadFolder}
              previewUrl={profileRemoved ? undefined : (profileImage ? undefined : teacher?.profileImage)}
              value={profileImage}
              onChange={(payload) => {
                if (payload === null) {
                  setProfileImage(null)
                  setProfileRemoved(true)
                } else {
                  setProfileImage(payload)
                  setProfileRemoved(false)
                }
              }}
              studentName={teacher?.name}
              removable
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">기본 정보</h3>

            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                placeholder="홍길동"
                {...form.register("name")}
              />
              {(state?.errors?.name || form.formState.errors.name) && (
                <p className="text-sm text-red-600">
                  {state?.errors?.name?.[0] || form.formState.errors.name?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameHanjaText">한자 이름 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <Input
                id="nameHanjaText"
                placeholder="洪吉東"
                value={nameHanjaText}
                onChange={(e) => setNameHanjaText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">이름 분석에 사용됩니다</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@example.com"
                {...form.register("email")}
              />
              <p className="text-xs text-muted-foreground">로그인 아이디로 사용됩니다</p>
              {(state?.errors?.email || form.formState.errors.email) && (
                <p className="text-sm text-red-600">
                  {state?.errors?.email?.[0] || form.formState.errors.email?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">연락처 *</Label>
              <Input
                id="phone"
                placeholder="010-0000-0000"
                {...form.register("phone")}
              />
              <p className="text-xs text-muted-foreground">010-0000-0000 형식으로 입력해주세요</p>
              {(state?.errors?.phone || form.formState.errors.phone) && (
                <p className="text-sm text-red-600">
                  {state?.errors?.phone?.[0] || form.formState.errors.phone?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일 *</Label>
              <Input
                id="birthDate"
                type="date"
                {...form.register("birthDate")}
              />
              <p className="text-xs text-muted-foreground">사주 분석의 기본 정보입니다</p>
              {(state?.errors?.birthDate || form.formState.errors.birthDate) && (
                <p className="text-sm text-red-600">
                  {state?.errors?.birthDate?.[0] || form.formState.errors.birthDate?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthTimeHour">태어난 시간</Label>
              <div className="flex items-center gap-2">
                <select
                  name="birthTimeHour"
                  id="birthTimeHour"
                  defaultValue={teacher?.birthTimeHour?.toString() ?? ""}
                  className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">시</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}시</option>
                  ))}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  name="birthTimeMinute"
                  id="birthTimeMinute"
                  defaultValue={teacher?.birthTimeMinute?.toString() ?? ""}
                  className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">분</option>
                  {[0, 10, 20, 30, 40, 50].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}분</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">사주 분석 시 시주 계산에 사용됩니다 (모르면 비워두세요)</p>
            </div>
          </div>

          {showRoleFields && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">역할 및 소속</h3>

              <div className="space-y-2">
                <Label htmlFor="role">역할 *</Label>
                <Select name="role" defaultValue={teacher?.role ?? "TEACHER"}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">선생님</SelectItem>
                    <SelectItem value="MANAGER">매니저</SelectItem>
                    <SelectItem value="TEAM_LEADER">팀장</SelectItem>
                    <SelectItem value="DIRECTOR">원장</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">원장, 팀장, 매니저, 선생님 중 선택합니다</p>
                {state?.errors?.role && (
                  <p className="text-sm text-red-600">{state.errors.role[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamId">팀 (선택)</Label>
                <Select name="teamId" defaultValue={teacher?.teamId ?? undefined}>
                  <SelectTrigger id="teamId">
                    <SelectValue placeholder="팀을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-team" disabled>
                        등록된 팀이 없습니다
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {state?.errors?.teamId && (
                  <p className="text-sm text-red-600">{state.errors.teamId[0]}</p>
                )}
              </div>
            </div>
          )}

          {isEdit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">비밀번호 변경</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                >
                  {showPasswordChange ? "취소" : "변경하기"}
                </Button>
              </div>
              {showPasswordChange && (
                <div className="space-y-2">
                  <Label htmlFor="password">새 비밀번호</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="새 비밀번호를 입력하세요"
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">8자 이상 입력해주세요. 비워두면 변경되지 않습니다.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending
                ? (isEdit ? "수정 중..." : "등록 중...")
                : (isEdit ? "수정하기" : "등록하기")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
