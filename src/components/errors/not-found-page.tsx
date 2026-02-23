'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

interface Suggestion {
  label: string
  href: string
}

interface NotFoundPageProps {
  resourceType?: string
  suggestions?: Suggestion[]
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: '목록으로', href: '/dashboard' },
  { label: '대시보드', href: '/dashboard' },
]

export function NotFoundPage({
  resourceType = '페이지',
  suggestions = DEFAULT_SUGGESTIONS
}: NotFoundPageProps) {
  const title = `${resourceType}을(를) 찾을 수 없어요`
  const description = `요청하신 ${resourceType} 정보를 찾을 수 없어요. 삭제되었거나 잘못된 주소일 수 있어요.`

  return (
    <div className="flex min-h-[400px] items-center justify-center" data-testid="not-found-page">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <Search className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <CardTitle className="mt-4 text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              asChild
              variant={index === 0 ? 'default' : 'outline'}
              className="w-full"
            >
              <Link href={suggestion.href}>{suggestion.label}</Link>
            </Button>
          ))}
        </CardFooter>
      </Card>
    </div>
  )
}
