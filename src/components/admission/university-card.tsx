'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, MapPin, ExternalLink, BookOpen } from 'lucide-react'
import type { UniversityWithMajors } from '@/features/admission/types'

const typeLabels: Record<string, string> = {
  FOUR_YEAR: '4년제',
  COLLEGE: '전문대',
  CYBER: '사이버대',
  EDUCATION: '교육대',
}

export function UniversityCard({ university }: { university: UniversityWithMajors }) {
  const t = useTranslations('Admission')

  return (
    <Link href={`/admission/${university.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{university.name}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {typeLabels[university.type] ?? university.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{university.region}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{university.majors.length}개 학과</span>
          </div>
          {university.website && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="truncate">{university.website}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
