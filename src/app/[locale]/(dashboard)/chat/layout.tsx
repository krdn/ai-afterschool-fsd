export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 대시보드 <main>의 max-w/padding 제약을 우회하여 전체 너비 사용
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 -mb-8">
      {children}
    </div>
  )
}
