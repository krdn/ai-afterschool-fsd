"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Users, MessageSquare, Heart, Star } from "lucide-react"

export interface TeacherWithMetrics {
  id: string
  name: string
  totalStudents: number
  averageGradeChange: number
  totalCounselingSessions: number
  averageCompatibilityScore: number
  averageSatisfactionScore?: number
  subjectDistribution: Record<string, number>
}

interface TeacherPerformanceCardProps {
  teacher: TeacherWithMetrics
  rank?: number
}

const SUBJECT_COLORS: Record<string, string> = {
  수학: "#3b82f6",
  영어: "#ef4444",
  국어: "#10b981",
  과학: "#f59e0b",
  사회: "#8b5cf6",
}

export function TeacherPerformanceCard({
  teacher,
  rank,
}: TeacherPerformanceCardProps) {
  const isPositiveChange = teacher.averageGradeChange >= 0
  const isTopPerformer = rank && rank <= 3

  return (
    <Card
      data-testid="metric-card"
      className={`transition-all hover:shadow-lg ${
        isTopPerformer
          ? "border-2 border-yellow-500 shadow-md"
          : teacher.averageGradeChange < 0
            ? "bg-red-50"
            : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{teacher.name}</CardTitle>
            {rank !== undefined && (
              <Badge
                variant={isTopPerformer ? "default" : "secondary"}
                className={`mt-1 ${isTopPerformer ? "bg-yellow-500 text-white" : ""}`}
              >
                순위 #{rank}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">총 담당 학생</div>
            <div className="text-2xl font-bold text-gray-900 flex items-center justify-end gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              {teacher.totalStudents}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">평균 성적 향상률</span>
          <div
            className={`flex items-center gap-1 font-semibold ${
              isPositiveChange ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositiveChange ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(teacher.averageGradeChange).toFixed(1)}%
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            총 상담 횟수
          </span>
          <span className="font-semibold">{teacher.totalCounselingSessions}회</span>
        </div>

        {teacher.averageSatisfactionScore !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-500" />
              평균 학생 만족도
            </span>
            <span className="font-semibold flex items-center gap-1">
              {teacher.averageSatisfactionScore.toFixed(1)}
              <span className="text-sm text-gray-500">/ 10</span>
            </span>
          </div>
        )}

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Heart className="w-4 h-4 text-gray-500" />
              평균 궁합 점수
            </span>
            <span className="font-semibold">
              {teacher.averageCompatibilityScore.toFixed(0)} / 100
            </span>
          </div>
          <Progress
            value={teacher.averageCompatibilityScore}
            className="h-2"
          />
        </div>

        <div>
          <span className="text-sm font-medium text-gray-600 mb-2 block">
            과목별 학생 분포
          </span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(teacher.subjectDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([subject, count]) => (
                <Badge
                  key={subject}
                  variant="outline"
                  className="border-2"
                  style={{
                    borderColor: SUBJECT_COLORS[subject] || "#6b7280",
                  }}
                >
                  {subject} {count}
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
