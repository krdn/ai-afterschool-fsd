import type { Metadata } from "next"

export const metadata: Metadata = {
  title: '상담 통계 | AI 방과후학교',
  description: '상담 통계 및 후속 조치 대시보드',
}

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
