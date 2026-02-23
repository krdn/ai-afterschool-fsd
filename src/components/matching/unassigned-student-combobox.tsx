"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface UnassignedStudent {
  id: string
  name: string
  school: string
  grade: number
}

export interface AssignedStudent extends UnassignedStudent {
  teacherId: string
  teacherName: string
}

interface StudentComboboxProps {
  students: UnassignedStudent[]
  assignedStudents?: AssignedStudent[]
  value: string | null
  onChange: (studentId: string | null) => void
  disabled?: boolean
}

export function UnassignedStudentCombobox({
  students,
  assignedStudents = [],
  value,
  onChange,
  disabled = false,
}: StudentComboboxProps) {
  const [open, setOpen] = useState(false)

  const allStudents = [...students, ...assignedStudents]
  const selectedStudent = allStudents.find((s) => s.id === value)
  const isAssigned = assignedStudents.some((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedStudent ? (
            <span className="truncate">
              {selectedStudent.name} ({selectedStudent.school} {selectedStudent.grade}학년)
              {isAssigned && (
                <span className="ml-1 text-xs text-orange-600">[재배정]</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">학생 선택...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command>
          <CommandInput placeholder="이름, 학교, 학년으로 검색..." />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            {students.length > 0 && (
              <CommandGroup heading={`미배정 학생 (${students.length}명)`}>
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={`${student.name} ${student.school} ${student.grade}학년 미배정`}
                    onSelect={() => {
                      onChange(student.id === value ? null : student.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === student.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {student.school} {student.grade}학년
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {assignedStudents.length > 0 && (
              <CommandGroup heading={`배정 학생 (${assignedStudents.length}명)`}>
                {assignedStudents.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={`${student.name} ${student.school} ${student.grade}학년 ${student.teacherName}`}
                    onSelect={() => {
                      onChange(student.id === value ? null : student.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === student.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {student.school} {student.grade}학년 · 담당: {student.teacherName}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
