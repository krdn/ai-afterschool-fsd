"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { toast } from "sonner"

interface CsvExportButtonProps<T = Record<string, unknown>> {
  data: T[]
  filename?: string
  headers?: string[]
  getRow?: (item: T) => (string | number)[]
  children?: React.ReactNode
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * CSV 내보내기 버튼 컴포넌트
 *
 * Blob API를 사용하여 CSV 파일을 생성하고 다운로드합니다.
 * BOM을 포함하여 한글 깨짐을 방지합니다.
 */
export function CsvExportButton<T = Record<string, unknown>>({
  data,
  filename = 'counseling-stats.csv',
  headers,
  getRow,
  children,
  variant = "outline",
  size = "default"
}: CsvExportButtonProps<T>) {

  const exportToCSV = () => {
    try {
      // 빈 데이터 체크
      if (!data || data.length === 0) {
        toast.error("내보낼 데이터가 없습니다")
        return
      }

      // CSV 헤더 생성
      let csvString = ''
      if (headers && headers.length > 0) {
        csvString += headers.join(',') + '\n'
      }

      // CSV 데이터 행 생성
      data.forEach((item) => {
        let row: unknown[]

        if (getRow) {
          // 사용자 정의 행 변환 함수 사용
          row = getRow(item)
        } else {
          // 기본: Object.values 사용
          row = Object.values(item as Record<string, unknown>)
        }

        // 각 셀을 문자열로 변환하고 이스케이프 처리
        const escapedRow = row.map((cell) => {
          const cellStr = String(cell ?? '')
          // 쉼표나 줄바꿈, 따옴표가 있으면 따옴표로 감싸기
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })

        csvString += escapedRow.join(',') + '\n'
      })

      // BOM 추가 (한글 깨짐 방지)
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' })

      // 다운로드 트리거
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // 정리
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("CSV 파일이 다운로드되었습니다")
    } catch (error) {
      console.error("CSV 내보내기 실패:", error)
      toast.error("CSV 파일 생성에 실패했습니다")
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={exportToCSV}
      className="gap-2"
    >
      <FileDown className="w-4 h-4" />
      {children || "CSV 다운로드"}
    </Button>
  )
}
