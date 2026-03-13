"use client"

import { useTranslations } from "next-intl"
import { PaginationNav } from "@/components/ui/pagination-nav"

type StudentPaginationProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
}

export function StudentPagination({
  page,
  totalPages,
  total,
  pageSize,
}: StudentPaginationProps) {
  const t = useTranslations("Student")

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <PaginationNav
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      infoText={t("paginationInfo", { start, end, total })}
    />
  )
}
