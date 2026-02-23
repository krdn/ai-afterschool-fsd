"use client"

import { useState, useMemo } from "react"
import { TeacherPerformanceCard, TeacherWithMetrics } from "./TeacherPerformanceCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PerformanceMetricsGridProps {
  teachers: TeacherWithMetrics[]
}

type SortOption = 'name' | 'students' | 'improvement' | 'counseling' | 'satisfaction' | 'compatibility'

export function PerformanceMetricsGrid({
  teachers,
}: PerformanceMetricsGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('improvement')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedTeachers = useMemo(() => {
    const sorted = [...teachers]
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'students':
          comparison = a.totalStudents - b.totalStudents
          break
        case 'improvement':
          comparison = a.averageGradeChange - b.averageGradeChange
          break
        case 'counseling':
          comparison = a.totalCounselingSessions - b.totalCounselingSessions
          break
        case 'satisfaction':
          comparison =
            (a.averageSatisfactionScore ?? 0) -
            (b.averageSatisfactionScore ?? 0)
          break
        case 'compatibility':
          comparison = a.averageCompatibilityScore - b.averageCompatibilityScore
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return sorted
  }, [teachers, sortBy, sortOrder])

  const rankedTeachers = sortedTeachers.map((teacher, index) => ({
    ...teacher,
    rank: index + 1,
  }))

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">정렬 기준:</label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">이름</SelectItem>
              <SelectItem value="students">담당 학생 수</SelectItem>
              <SelectItem value="improvement">성적 향상률</SelectItem>
              <SelectItem value="counseling">상담 횟수</SelectItem>
              <SelectItem value="satisfaction">학생 만족도</SelectItem>
              <SelectItem value="compatibility">궁합 점수</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">순서:</label>
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">내림차순</SelectItem>
              <SelectItem value="asc">오름차순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rankedTeachers.map((teacher) => (
          <TeacherPerformanceCard
            key={teacher.id}
            teacher={teacher}
            rank={teacher.rank}
          />
        ))}
      </div>
    </div>
  )
}
