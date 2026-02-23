'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX } from 'lucide-react'

interface AccessDeniedPageProps {
  resource?: string
  action?: string
}

export function AccessDeniedPage({
  resource = '이 페이지',
  action = '접근'
}: AccessDeniedPageProps) {
  const router = useRouter()

  useEffect(() => {
    toast.error('이 페이지에 접근할 권한이 없습니다', {
      id: 'access-denied',
    })
  }, [])

  return (
    <div className="flex min-h-[400px] items-center justify-center" data-testid="access-denied-page">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="mt-4 text-center">접근 권한이 없어요</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">
            {resource}에 {action}할 권한이 없어요.
          </p>
          <p className="text-sm text-muted-foreground">
            필요한 권한이 있는지 확인하거나 관리자에게 문의해주세요.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" onClick={() => router.back()}>
            <Link href="/students">학생 목록</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
