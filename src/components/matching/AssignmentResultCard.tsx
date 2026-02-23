'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, UserMinus, Users } from 'lucide-react'

/**
 * 배정 결과 카드 Props
 */
export interface AssignmentResultCardProps {
  totalStudents: number
  assignedCount: number
  excludedCount: number
  successCount: number
  failureCount: number
  averageScore: number
  createdAt: Date
  status: string
}

/**
 * 상태Badge 색상 매핑
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toUpperCase()) {
    case 'APPLIED':
      return 'default'
    case 'PENDING':
      return 'secondary'
    case 'CANCELLED':
      return 'outline'
    default:
      return 'secondary'
  }
}

/**
 * 상태 라벨 매핑
 */
function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'APPLIED':
      return '적용 완료'
    case 'PENDING':
      return '대기 중'
    case 'CANCELLED':
      return '취소됨'
    default:
      return status
  }
}

/**
 * 배정 결과 요약 카드 컴포넌트
 *
 * 자동 배정 결과를 시각화하여 보여주는 카드 컴포넌트입니다.
 */
export function AssignmentResultCard({
  totalStudents,
  assignedCount,
  excludedCount,
  successCount,
  failureCount,
  averageScore,
  createdAt,
  status
}: AssignmentResultCardProps) {
  return (
    <Card data-testid="assignment-result-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>배정 결과 요약</CardTitle>
          <Badge variant={getStatusVariant(status)} data-testid="assignment-status">
            {getStatusLabel(status)}
          </Badge>
        </div>
        <CardDescription>
          생성일: {new Date(createdAt).toLocaleString('ko-KR')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 배정 완료 */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950" data-testid="assigned-count">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
              <Users className="h-4 w-4" />
              <span className="font-medium">배정 완료</span>
            </div>
            <p className="text-2xl font-bold">
              {assignedCount}
              <span className="text-sm text-muted-foreground ml-1">/ {totalStudents}명</span>
            </p>
          </div>

          {/* 제외됨 */}
          <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950" data-testid="excluded-count">
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 mb-1">
              <UserMinus className="h-4 w-4" />
              <span className="font-medium">제외됨</span>
            </div>
            <p className="text-2xl font-bold">
              {excludedCount}
              <span className="text-sm text-muted-foreground ml-1">명</span>
            </p>
          </div>

          {/* 성공 */}
          <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950" data-testid="success-count">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">성공 (60점+)</span>
            </div>
            <p className="text-2xl font-bold">
              {successCount}
              <span className="text-sm text-muted-foreground ml-1">명</span>
            </p>
          </div>

          {/* 실패 */}
          <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950" data-testid="failure-count">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">실패 (60점미만)</span>
            </div>
            <p className="text-2xl font-bold">
              {failureCount}
              <span className="text-sm text-muted-foreground ml-1">명</span>
            </p>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          평균 궁합 점수: <span className="font-semibold text-foreground">{averageScore.toFixed(1)}점</span>
        </div>
      </CardContent>
    </Card>
  )
}
