import { NotFoundPage } from "@/components/errors/not-found-page"

export default function DashboardNotFound() {
  return (
    <NotFoundPage
      resourceType="페이지"
      suggestions={[
        { label: "대시보드", href: "/dashboard" },
        { label: "학생 목록", href: "/students" },
        { label: "상담 관리", href: "/counseling" },
      ]}
    />
  )
}
