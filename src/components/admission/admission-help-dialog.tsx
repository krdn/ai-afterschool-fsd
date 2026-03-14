'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  HelpCircle, GraduationCap, Sparkles, BarChart3,
  Lightbulb, Settings, RotateCcw, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getAdmissionSettingsAction, updateAdmissionSettingsAction } from '@/lib/actions/admission/settings'
import { DEFAULT_ADMISSION_SETTINGS, type AdmissionSettings } from '@/features/admission/types'

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 flex gap-2">
      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <p className="text-sm text-blue-700 dark:text-blue-300">{children}</p>
    </div>
  )
}

function SettingsTab() {
  const t = useTranslations('Admission')
  const [settings, setSettings] = useState<AdmissionSettings>(DEFAULT_ADMISSION_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = async () => {
    if (loaded) return
    setIsLoading(true)
    const res = await getAdmissionSettingsAction()
    if (res.success) {
      setSettings(res.data)
    }
    setIsLoading(false)
    setLoaded(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const res = await updateAdmissionSettingsAction(settings)
    setIsSaving(false)
    if (res.success) {
      toast.success(t('settingsSaved'))
    } else {
      toast.error(res.error)
    }
  }

  const handleReset = () => {
    setSettings(DEFAULT_ADMISSION_SETTINGS)
  }

  // 탭 진입 시 로드
  if (!loaded) loadSettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('defaultAcademicYear')}</Label>
          <Input
            type="number"
            value={settings.defaultAcademicYear}
            onChange={(e) => setSettings({ ...settings, defaultAcademicYear: Number(e.target.value) })}
            className="w-24 text-right"
            min={2020}
            max={2030}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t('defaultAdmissionType')}</Label>
          <Select
            value={settings.defaultAdmissionType}
            onValueChange={(v) => setSettings({ ...settings, defaultAdmissionType: v })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="수시">수시</SelectItem>
              <SelectItem value="정시">정시</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>{t('autoAnalysis')}</Label>
          <Switch
            checked={settings.autoAnalysis}
            onCheckedChange={(v) => setSettings({ ...settings, autoAnalysis: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t('analysisRefreshDays')}</Label>
          <Input
            type="number"
            value={settings.analysisRefreshDays}
            onChange={(e) => setSettings({ ...settings, analysisRefreshDays: Number(e.target.value) })}
            className="w-24 text-right"
            min={1}
            max={30}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t('showTrendChart')}</Label>
          <Switch
            checked={settings.showTrendChart}
            onCheckedChange={(v) => setSettings({ ...settings, showTrendChart: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t('maxTargetsPerStudent')}</Label>
          <Input
            type="number"
            value={settings.maxTargetsPerStudent}
            onChange={(e) => setSettings({ ...settings, maxTargetsPerStudent: Number(e.target.value) })}
            className="w-24 text-right"
            min={1}
            max={10}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t('settings')} 저장
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-1">
          <RotateCcw className="h-4 w-4" />
          {t('resetToDefault')}
        </Button>
      </div>
    </div>
  )
}

export function AdmissionHelpDialog() {
  const t = useTranslations('Admission')
  const [tab, setTab] = useState('overview')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t('help')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {t('title')} {t('help')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="text-xs">개요</TabsTrigger>
            <TabsTrigger value="ai-research" className="text-xs">AI 수집</TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs">분석</TabsTrigger>
            <TabsTrigger value="tips" className="text-xs">활용 팁</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">{t('settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="max-h-[calc(85vh-200px)]">
              <div className="space-y-4 pr-4">
                <SectionCard icon={GraduationCap} title="입시 정보 관리란?">
                  <p>대학 입시 정보를 AI로 자동 수집하고, 학생 성적과 비교하여 합격 가능성을 분석하는 기능입니다.</p>
                </SectionCard>

                <SectionCard icon={Sparkles} title="전체 흐름">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>AI로 대학/학과 입시 정보 검색</li>
                    <li>수집 결과 검토 후 승인</li>
                    <li>학생별 목표 대학 설정</li>
                    <li>합격 가능성 분석 실행</li>
                  </ol>
                </SectionCard>

                <SectionCard icon={BarChart3} title="제공 데이터">
                  <div className="flex flex-wrap gap-1">
                    {['내신 등급컷', '수능 점수컷', '백분위', '경쟁률', '모집인원', '필수 과목'].map((item) => (
                      <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                    ))}
                  </div>
                </SectionCard>

                <TipBox>
                  연도별 커트라인 추이를 확인하면 해당 학과의 입시 난이도 변화를 파악할 수 있습니다.
                </TipBox>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai-research" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="max-h-[calc(85vh-200px)]">
              <div className="space-y-4 pr-4">
                <SectionCard icon={Sparkles} title="AI 수집 방식">
                  <p>Perplexity AI의 웹 검색 기능을 활용하여 최신 입시 정보를 실시간으로 수집합니다. 진학사, 유웨이, 대학 입학처 등의 공신력 있는 출처에서 데이터를 가져옵니다.</p>
                </SectionCard>

                <SectionCard icon={GraduationCap} title="수집 프로세스">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>대학명과 학과명 입력</li>
                    <li>AI가 웹에서 최근 3년간 데이터 수집</li>
                    <li>수집 결과를 카드 형태로 미리보기</li>
                    <li>교사가 데이터 확인 후 승인/수정/거부</li>
                    <li>승인된 데이터만 DB에 저장</li>
                  </ol>
                </SectionCard>

                <TipBox>
                  학과명을 비워두면 해당 대학의 전체 학과 정보를 수집합니다. 특정 학과만 필요하면 학과명을 입력하세요.
                </TipBox>

                <SectionCard icon={BarChart3} title="데이터 신뢰도">
                  <p>AI가 수집한 데이터는 반드시 교사 검토를 거칩니다. 검증된 데이터에는 &quot;검증됨&quot; 배지가 표시됩니다. 데이터 출처 URL도 함께 기록됩니다.</p>
                </SectionCard>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="max-h-[calc(85vh-200px)]">
              <div className="space-y-4 pr-4">
                <SectionCard icon={BarChart3} title="합격 가능성 분석">
                  <p>학생의 현재 성적(내신, 모의고사)과 목표 대학의 합격 커트라인을 AI가 비교 분석하여 합격 가능성을 산출합니다.</p>
                </SectionCard>

                <SectionCard icon={GraduationCap} title="등급 기준">
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">안정</Badge>
                      <span>80% 이상</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">적정</Badge>
                      <span>50~79%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">도전</Badge>
                      <span>30~49%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">상향도전</Badge>
                      <span>30% 미만</span>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={BarChart3} title="커트라인 추세 읽는 법">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>내신 등급컷 하락</strong> → 입시 난이도 상승 (더 좋은 등급 필요)</li>
                    <li><strong>경쟁률 상승</strong> → 지원자 증가, 합격 난이도 상승</li>
                    <li><strong>모집인원 감소</strong> → 합격 확률 하락</li>
                  </ul>
                </SectionCard>

                <TipBox>
                  성적 추세가 &quot;상승&quot;인 학생은 동일 점수의 &quot;하락&quot; 학생보다 합격 가능성이 높게 산출됩니다.
                </TipBox>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tips" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="max-h-[calc(85vh-200px)]">
              <div className="space-y-4 pr-4">
                <SectionCard icon={Lightbulb} title="효과적인 활용법">
                  <ul className="list-disc list-inside space-y-1">
                    <li>학생당 3~5개 목표 대학 설정 (안정, 적정, 도전 분산)</li>
                    <li>정기 시험 후 분석 재실행하여 변화 추적</li>
                    <li>커트라인 추세와 학생 성적 추세를 함께 비교</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={GraduationCap} title="상담 시 활용 포인트">
                  <ul className="list-disc list-inside space-y-1">
                    <li>합격 가능성 카드로 현실적 목표 설정 유도</li>
                    <li>과목별 개선 우선순위로 학습 전략 제안</li>
                    <li>연도별 추세로 학과 인기도 변화 설명</li>
                    <li>경쟁률 데이터로 지원 전략 (안정 vs 도전) 논의</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={Sparkles} title="데이터 업데이트 권장 시기">
                  <ul className="list-disc list-inside space-y-1">
                    <li>수시 원서 접수 전 (8~9월)</li>
                    <li>수능 성적 발표 후 (12월)</li>
                    <li>정시 원서 접수 전 (1월)</li>
                    <li>전년도 입시 결과 공개 시 (3~4월)</li>
                  </ul>
                </SectionCard>

                <TipBox>
                  &quot;최신 정보 업데이트&quot; 버튼으로 기존 데이터와 새 데이터의 차이를 확인할 수 있습니다.
                </TipBox>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="max-h-[calc(85vh-200px)]">
              <div className="pr-4">
                <SettingsTab />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
