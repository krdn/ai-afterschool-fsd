"use client"

import type { ExpertiseCoverage } from "@/features/matching"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ExpertiseCoverageChartProps {
  coverage: ExpertiseCoverage
}

const SUBJECTS = ["수학", "영어", "국어", "과학", "사회"] as const
const GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const

function getCoverageColor(count: number, maxCount: number): string {
  if (count === 0) return "bg-red-100 text-red-800"
  if (count < maxCount * 0.5) return "bg-red-200 text-red-900"
  if (count < maxCount) return "bg-yellow-200 text-yellow-900"
  return "bg-green-200 text-green-900"
}

function getCoverageLabel(count: number, maxCount: number): string {
  if (count === 0) return "부족"
  if (count < maxCount * 0.5) return "부족"
  if (count < maxCount) return "적정"
  return "충분"
}

export function ExpertiseCoverageChart({ coverage }: ExpertiseCoverageChartProps) {
  const maxSubjectTeachers = Math.max(...Object.values(coverage.subjects), 1)

  const hasWeakSubjects = coverage.weakSubjects.length > 0
  const hasWeakGrades = coverage.weakGrades.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">전문성 커버리지</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-sm font-medium text-gray-700 bg-gray-50 text-left">
                    과목
                  </th>
                  {GRADES.map(grade => (
                    <th key={grade} className="border border-gray-300 p-2 text-sm font-medium text-gray-700 bg-gray-50">
                      {grade}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map(subject => {
                  const isWeak = coverage.weakSubjects.includes(subject)
                  return (
                    <tr key={subject} className={isWeak ? "bg-red-50" : ""}>
                      <td className={`border border-gray-300 p-2 text-sm font-medium ${isWeak ? "text-red-700" : ""}`}>
                        {subject}
                      </td>
                      {GRADES.map(grade => {
                        const count = 0
                        return (
                          <td
                            key={`${subject}-${grade}`}
                            className={`border border-gray-300 p-2 text-sm text-center ${getCoverageColor(count, maxSubjectTeachers)}`}
                          >
                            <div className="font-bold">{count}</div>
                            <div className="text-xs opacity-75">{getCoverageLabel(count, maxSubjectTeachers)}</div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {hasWeakSubjects && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800">취약 과목:</p>
              <p className="text-sm text-red-700">{coverage.weakSubjects.join(", ")}</p>
            </div>
          )}

          {hasWeakGrades && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="font-medium text-orange-800">취약 학년:</p>
              <p className="text-sm text-orange-700">{coverage.weakGrades.join(", ")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">과목별 선생님 수</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(coverage.subjects).map(([subject, count]) => (
              <div
                key={subject}
                className={`flex justify-between items-center p-3 rounded-lg border ${getCoverageColor(count, maxSubjectTeachers)}`}
              >
                <span className="font-medium">{subject}</span>
                <span className="text-2xl font-bold">{count}명</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">경력 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">신입 (&lt;1년)</p>
              <p className="text-2xl font-bold text-blue-900">{coverage.experienceLevels.junior}명</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-700">중급 (1-3년)</p>
              <p className="text-2xl font-bold text-purple-900">{coverage.experienceLevels.mid}명</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">고급 (3+년)</p>
              <p className="text-2xl font-bold text-green-900">{coverage.experienceLevels.senior}명</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
