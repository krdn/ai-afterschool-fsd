"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Info } from "lucide-react"

interface ControlVariablePanelProps {
  controlVariables: {
    initialGradeFilter: boolean
    attendanceFilter: boolean
  }
  onToggle: (key: "initialGradeFilter" | "attendanceFilter") => void
}

export function ControlVariablePanel({
  controlVariables,
  onToggle,
}: ControlVariablePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          통제 변수
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="initial-grade-filter" className="text-sm font-medium">
              초기 성적 필터링
            </Label>
            <p className="text-xs text-gray-500">
              HIGH/MID/LOW 초기 성적 수준 조정 적용
            </p>
          </div>
          <Switch
            id="initial-grade-filter"
            checked={controlVariables.initialGradeFilter}
            onCheckedChange={() => onToggle("initialGradeFilter")}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="attendance-filter" className="text-sm font-medium">
              출석률 필터링
            </Label>
            <p className="text-xs text-gray-500">
              출석률 80% 이상 학생만 포함
            </p>
          </div>
          <Switch
            id="attendance-filter"
            checked={controlVariables.attendanceFilter}
            onCheckedChange={() => onToggle("attendanceFilter")}
          />
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            공정한 비교를 위해 통제 변수를 적용했습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
