import { NotFoundPage } from '@/components/errors/not-found-page'

export default function TeacherNotFound() {
  return (
    <NotFoundPage
      resourceType="선생님"
      suggestions={[
        { label: '선생님 목록', href: '/teachers' },
        { label: '대시보드', href: '/dashboard' },
        { label: '학생 목록', href: '/students' },
      ]}
    />
  )
}
