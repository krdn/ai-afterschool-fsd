'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Search, Loader2, Check, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { requestResearchAction, approveResearchAction, rejectResearchAction } from '@/lib/actions/admission/ai-research'
import type { AIResearchResult } from '@/features/admission/types'

export function AIResearchPanel() {
  const t = useTranslations('Admission')
  const [open, setOpen] = useState(false)
  const [universityName, setUniversityName] = useState('')
  const [majorName, setMajorName] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<AIResearchResult | null>(null)
  const [syncId, setSyncId] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)

  const handleSearch = async () => {
    if (!universityName.trim()) return
    setIsSearching(true)
    setResult(null)

    const res = await requestResearchAction({
      universityName: universityName.trim(),
      majorName: majorName.trim() || undefined,
    })

    setIsSearching(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }

    if (res.data.error) {
      toast.error(res.data.error)
    }

    setSyncId(res.data.syncId)
    setResult(res.data.result)
  }

  const handleApprove = async () => {
    if (!syncId) return
    setIsApproving(true)

    const res = await approveResearchAction(syncId, result ?? undefined)
    setIsApproving(false)

    if (res.success) {
      toast.success('입시 정보가 저장되었습니다.')
      setOpen(false)
      setResult(null)
      setSyncId(null)
      setUniversityName('')
      setMajorName('')
    } else {
      toast.error(res.error)
    }
  }

  const handleReject = async () => {
    if (!syncId) return
    await rejectResearchAction(syncId)
    toast.info('수집 결과를 거부했습니다.')
    setResult(null)
    setSyncId(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          {t('requestResearch')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('requestResearch')}</DialogTitle>
          <DialogDescription>
            AI가 웹에서 최신 입시 정보를 검색하여 수집합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('searchUniversity')}</Label>
              <Input
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                placeholder="예: 서울대학교"
                disabled={isSearching}
              />
            </div>
            <div className="space-y-1.5">
              <Label>학과명 (선택)</Label>
              <Input
                value={majorName}
                onChange={(e) => setMajorName(e.target.value)}
                placeholder="예: 컴퓨터공학부"
                disabled={isSearching}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !universityName.trim()}
            className="w-full gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('researchInProgress')}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t('aiResearch')}
              </>
            )}
          </Button>
        </div>

        {result && (
          <ScrollArea className="max-h-[calc(85vh-300px)] mt-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">{result.university.name}</h3>
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline">{result.university.region}</Badge>
                  <Badge variant="secondary">
                    {result.university.type === 'FOUR_YEAR' ? '4년제' : result.university.type}
                  </Badge>
                </div>
              </div>

              {result.majors.map((major, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">{major.majorName}</h4>
                  {major.department && (
                    <Badge variant="outline">{major.department}</Badge>
                  )}
                  {major.requiredSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {major.requiredSubjects.map((subj, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">{subj}</Badge>
                      ))}
                    </div>
                  )}
                  {major.cutoffs.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 pr-3">{t('academicYear')}</th>
                            <th className="pb-2 pr-3">{t('admissionType')}</th>
                            <th className="pb-2 pr-3">{t('cutoffGrade')}</th>
                            <th className="pb-2 pr-3">{t('competitionRate')}</th>
                            <th className="pb-2">{t('enrollmentCount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {major.cutoffs.map((cutoff, k) => (
                            <tr key={k} className="border-b last:border-0">
                              <td className="py-2 pr-3">{cutoff.academicYear}</td>
                              <td className="py-2 pr-3">{cutoff.admissionType}</td>
                              <td className="py-2 pr-3">{cutoff.cutoffGrade ?? '-'}</td>
                              <td className="py-2 pr-3">{cutoff.competitionRate ? `${cutoff.competitionRate}:1` : '-'}</td>
                              <td className="py-2">{cutoff.enrollmentCount ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {result.sources.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('dataSource')}</p>
                  <div className="space-y-0.5">
                    {result.sources.map((src, i) => (
                      <p key={i} className="text-xs text-muted-foreground truncate">{src}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleApprove} disabled={isApproving} className="flex-1 gap-2">
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('approve')}
                </Button>
                <Button variant="outline" onClick={handleReject} className="gap-2">
                  <X className="h-4 w-4" />
                  {t('reject')}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
