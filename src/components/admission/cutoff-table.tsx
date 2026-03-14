'use client'

import { useTranslations } from 'next-intl'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { AdmissionCutoff } from '@prisma/client'

export function CutoffTable({ cutoffs }: { cutoffs: AdmissionCutoff[] }) {
  const t = useTranslations('Admission')

  if (cutoffs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">{t('noData')}</p>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('academicYear')}</TableHead>
            <TableHead>{t('admissionType')}</TableHead>
            <TableHead className="text-right">{t('cutoffGrade')}</TableHead>
            <TableHead className="text-right">{t('cutoffScore')}</TableHead>
            <TableHead className="text-right">{t('competitionRate')}</TableHead>
            <TableHead className="text-right">{t('enrollmentCount')}</TableHead>
            <TableHead className="text-center">{t('status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cutoffs.map((cutoff) => (
            <TableRow key={cutoff.id}>
              <TableCell className="font-medium">{cutoff.academicYear}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{cutoff.admissionType}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {cutoff.cutoffGrade != null ? `${cutoff.cutoffGrade}등급` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {cutoff.cutoffScore != null ? `${cutoff.cutoffScore}점` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {cutoff.competitionRate != null ? `${cutoff.competitionRate}:1` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {cutoff.enrollmentCount != null ? `${cutoff.enrollmentCount}명` : '-'}
              </TableCell>
              <TableCell className="text-center">
                {cutoff.isVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
