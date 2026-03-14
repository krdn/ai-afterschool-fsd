'use client'

import { useState } from 'react'
import { HelpCircle, Brain, ClipboardList, Cpu, Lightbulb, BarChart3, Target, BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        {children}
      </div>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
      <p className="font-medium flex items-center gap-1">
        <Lightbulb className="h-3.5 w-3.5" />
        활용 팁
      </p>
      {children}
    </div>
  )
}

export function NeuroscienceHelpDialog() {
  const [tab, setTab] = useState('overview')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">도움말</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            뇌과학 학습 전략 추천 가이드
          </DialogTitle>
          <DialogDescription>
            학생의 조건에 맞는 뇌과학 기반 학습 전략을 AI가 추천합니다
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="conditions">입력 조건</TabsTrigger>
            <TabsTrigger value="brain">뇌과학 도메인</TabsTrigger>
            <TabsTrigger value="tips">활용 가이드</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview">
            <ScrollArea className="max-h-[450px]">
              <div className="space-y-4 pr-2">
                <SectionCard icon={Brain} title="이 기능은 무엇인가요?">
                  <p>
                    학생의 개별 조건(학습유형, 성격, 성적, 현재 상황)을 AI에게 전달하면,
                    <strong> 뇌과학 연구 근거</strong>에 기반한 맞춤형 학습 전략 3~5개를 추천받습니다.
                  </p>
                  <p>
                    각 전략에는 뇌과학 근거(해마, 전전두엽, 도파민 등), 이 학생에게 적합한 이유,
                    구체적 실행 단계, 예상 효과가 포함됩니다.
                  </p>
                </SectionCard>

                <SectionCard icon={ClipboardList} title="사용 순서">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li><strong>학생 선택</strong> — 분석할 학생을 선택합니다. VARK/MBTI 분석이 되어 있으면 더 정확한 추천이 가능합니다.</li>
                    <li><strong>분석 엔진 선택</strong> — "자동"은 시스템이 최적의 AI 모델을 선택합니다. 특정 모델을 직접 지정할 수도 있습니다.</li>
                    <li><strong>학습 상황 입력</strong> — 과목, 난이도, 학습 시간대, 예정 시간 등 현재 상황을 입력합니다.</li>
                    <li><strong>학습 목표 선택</strong> — 암기, 이해, 문제풀이, 창의성, 복습 중 선택합니다.</li>
                    <li><strong>전략 추천받기</strong> — AI가 10~30초간 분석 후 맞춤 전략을 제시합니다.</li>
                  </ol>
                </SectionCard>

                <SectionCard icon={Cpu} title="자동 수집되는 학생 데이터">
                  <p>학생을 선택하면 아래 데이터가 자동으로 AI에 전달됩니다:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">VARK 학습유형</Badge>
                    <Badge variant="outline" className="text-xs">MBTI 성격유형</Badge>
                    <Badge variant="outline" className="text-xs">사주 성향</Badge>
                    <Badge variant="outline" className="text-xs">통합 성향 요약</Badge>
                    <Badge variant="outline" className="text-xs">성적 추이</Badge>
                    <Badge variant="outline" className="text-xs">취약/강점 과목</Badge>
                    <Badge variant="outline" className="text-xs">나이/학년</Badge>
                  </div>
                  <p className="mt-1 text-xs">
                    분석 데이터가 없어도 사용 가능하지만, VARK/MBTI 분석을 먼저 완료하면 더 정확한 전략을 받을 수 있습니다.
                  </p>
                </SectionCard>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 입력 조건 탭 */}
          <TabsContent value="conditions">
            <ScrollArea className="max-h-[450px]">
              <div className="space-y-4 pr-2">
                <SectionCard icon={BookOpen} title="과목 & 난이도">
                  <p>학습할 과목명을 자유롭게 입력합니다 (예: 수학, 영어, 물리, 코딩).</p>
                  <p>난이도에 따라 추천 전략이 달라집니다:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li><strong>쉬움</strong> — 자동화/반복 학습, 속도 향상 전략</li>
                    <li><strong>보통</strong> — 균형잡힌 이해+연습 전략</li>
                    <li><strong>어려움</strong> — 청크 분해, 스캐폴딩, 점진적 난이도 상승 전략</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={Target} title="학습 목표">
                  <div className="space-y-2">
                    <div>
                      <Badge variant="secondary" className="text-xs">암기</Badge>
                      <span className="text-xs ml-2">단어, 공식, 연도 등을 외워야 할 때 → 간격 반복, 인출 연습, 기억 궁전 등</span>
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs">이해</Badge>
                      <span className="text-xs ml-2">개념을 깊이 파악해야 할 때 → 자기 설명, 유추, 개념 지도 등</span>
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs">문제풀이</Badge>
                      <span className="text-xs ml-2">실전 문제 해결력이 필요할 때 → 인터리빙, 의도적 연습 등</span>
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs">창의성</Badge>
                      <span className="text-xs ml-2">새로운 아이디어가 필요할 때 → 확산적 사고, 디폴트 모드 네트워크 활용 등</span>
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs">복습</Badge>
                      <span className="text-xs ml-2">배운 내용을 정착시킬 때 → 수면 전 복습, 능동적 회상, 요약 등</span>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={BarChart3} title="피로도 & 집중력 (선택)">
                  <p>학생의 현재 상태를 입력하면 이에 맞는 전략을 추천합니다:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li><strong>피로도 높음</strong> → 짧은 세션, 운동 휴식, 가벼운 복습 위주</li>
                    <li><strong>집중력 낮음</strong> → 포모도로, 환경 변화, 다감각 접근 위주</li>
                    <li><strong>피로도 낮음 + 집중력 높음</strong> → 깊은 학습, 도전적 과제 가능</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={ClipboardList} title="학습 시간대">
                  <p>뇌과학적으로 시간대에 따라 최적의 학습 활동이 다릅니다:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li><strong>오전</strong> — 전전두엽 활성 시간. 분석적 사고, 수학, 논리 학습에 적합</li>
                    <li><strong>오후</strong> — 작업 기억 안정 시간. 협업, 토론, 실습에 적합</li>
                    <li><strong>저녁</strong> — 기억 고정화 준비 시간. 복습, 정리, 가벼운 암기에 적합</li>
                  </ul>
                </SectionCard>

                <TipBox>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>"구체적 학습 주제"에 세부 주제를 입력하면 더 구체적인 전략을 받을 수 있습니다</li>
                    <li>모든 선택 항목은 비워둬도 됩니다 — 입력할수록 정확도가 올라갑니다</li>
                  </ul>
                </TipBox>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 뇌과학 도메인 탭 */}
          <TabsContent value="brain">
            <ScrollArea className="max-h-[450px]">
              <div className="space-y-3 pr-2">
                <p className="text-sm text-muted-foreground">
                  AI는 아래 6개 뇌과학 도메인에 기반하여 전략을 추천합니다.
                  각 전략의 "뇌과학 근거" 항목에서 관련 메커니즘을 확인할 수 있습니다.
                </p>

                {BRAIN_DOMAINS.map((domain) => (
                  <div key={domain.name} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{domain.icon} {domain.name}</span>
                      <div className="flex gap-1">
                        {domain.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{domain.description}</p>
                    <div className="grid grid-cols-[70px_1fr] gap-y-0.5 gap-x-2 text-xs">
                      <span className="text-muted-foreground">핵심 개념</span>
                      <span>{domain.concepts}</span>
                      <span className="text-muted-foreground">교육 적용</span>
                      <span>{domain.application}</span>
                    </div>
                  </div>
                ))}

                <TipBox>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>AI가 "연구 중인 영역"으로 표시한 내용은 아직 과학적 합의가 부족한 분야입니다</li>
                    <li>학습 스타일(시각형/청각형 등) 고정론은 뇌과학에서 반박되고 있어, 다감각 접근을 권장합니다</li>
                  </ul>
                </TipBox>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 활용 가이드 탭 */}
          <TabsContent value="tips">
            <ScrollArea className="max-h-[450px]">
              <div className="space-y-4 pr-2">
                <SectionCard icon={Target} title="이런 상황에서 활용하세요">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>수업 준비 시</strong> — "이 학생에게 이차방정식을 어떻게 가르칠까?" → 과목+목표+학생 프로필로 맞춤 전략</li>
                    <li><strong>학생이 어려워할 때</strong> — "집중을 못하고 피곤해하는데?" → 피로도 높음 + 집중력 낮음 설정</li>
                    <li><strong>시험 대비</strong> — "효율적 암기법은?" → 목표: 암기 + 구체적 주제 입력</li>
                    <li><strong>학부모 상담</strong> — "가정에서 어떻게 도와줄 수 있을까?" → 결과를 학부모에게 공유</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={Lightbulb} title="더 좋은 결과를 얻으려면">
                  <ul className="list-disc list-inside space-y-1">
                    <li>학생의 <strong>VARK 분석</strong>과 <strong>MBTI 분석</strong>을 먼저 완료하세요 — AI가 학습유형과 성격을 반영합니다</li>
                    <li><strong>구체적 학습 주제</strong>를 입력하세요 — "수학" 보다 "이차방정식 근의 공식"이 더 구체적인 전략을 생성합니다</li>
                    <li><strong>피로도와 집중력</strong>을 설정하세요 — 학생의 현재 상태에 맞는 현실적 전략이 나옵니다</li>
                    <li>같은 학생이라도 <strong>조건을 바꿔</strong> 여러 번 추천받으면 다양한 전략을 비교할 수 있습니다</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={Cpu} title="분석 엔진 선택 가이드">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>자동 (스마트 라우팅)</strong> — 시스템이 최적의 AI 모델을 자동 선택합니다. 대부분의 경우 이 옵션을 권장합니다.</li>
                    <li><strong>특정 모델 지정</strong> — Claude, GPT-4o 등 특정 모델을 선택할 수 있습니다. 한국어 전략이 필요하면 Claude나 GPT-4o를 권장합니다.</li>
                  </ul>
                </SectionCard>

                <SectionCard icon={BarChart3} title="결과 해석하기">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>전략 이름</strong> — 클릭하면 상세 내용이 펼쳐집니다</li>
                    <li><strong>뇌과학 근거</strong> — 이 전략이 효과적인 뇌과학적 이유 (해마, 도파민 등)</li>
                    <li><strong>맞춤 이유</strong> — 이 학생의 특성에 왜 적합한지 설명</li>
                    <li><strong>실행 단계</strong> — 교사가 바로 적용할 수 있는 구체적 방법</li>
                    <li><strong>종합 조언</strong> — 전체 전략을 아우르는 핵심 메시지</li>
                    <li><strong>관련 뇌과학 개념</strong> — 더 알고 싶을 때 검색할 키워드</li>
                  </ul>
                </SectionCard>

                <TipBox>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>AI 추천은 참고 자료입니다. 교사의 경험과 학생 관찰을 함께 활용하세요</li>
                    <li>응답 시간은 AI 모델에 따라 10~60초 정도 소요됩니다</li>
                  </ul>
                </TipBox>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

const BRAIN_DOMAINS = [
  {
    name: '기억',
    icon: '🧠',
    tags: ['해마', 'LTP', '간격 반복'],
    description: '정보가 단기 기억에서 장기 기억으로 전환되는 과정을 이해하면, 복습 타이밍과 방법을 최적화할 수 있습니다.',
    concepts: '해마(Hippocampus), 장기강화(LTP), 간격 반복(Spaced Repetition), 인출 연습(Retrieval Practice)',
    application: '복습 타이밍 최적화, 능동적 회상, 플래시카드 전략',
  },
  {
    name: '주의력',
    icon: '🎯',
    tags: ['전전두엽', '선택적 주의'],
    description: '집중력에는 생물학적 한계가 있으며, 주의 피로를 관리하면 학습 효율이 크게 향상됩니다.',
    concepts: '전전두엽(Prefrontal Cortex), 선택적 주의, 주의 피로, 울트라디안 리듬(90분 주기)',
    application: '집중 시간 관리 (포모도로), 환경 설계, 멀티태스킹 방지',
  },
  {
    name: '동기',
    icon: '🔥',
    tags: ['도파민', '보상 회로'],
    description: '도파민 시스템은 "보상 예측"에 반응합니다. 적절한 난이도와 즉각적 피드백이 학습 동기를 유지합니다.',
    concepts: '도파민 보상 회로, 내재적/외재적 동기, 자기결정이론(SDT), 플로우 상태',
    application: '성취감 설계, 난이도 조절, 게이미피케이션, 자율성 부여',
  },
  {
    name: '감정',
    icon: '💚',
    tags: ['편도체', '코르티솔'],
    description: '스트레스가 과도하면 편도체가 전전두엽을 억제하여 학습이 어려워집니다. 심리적 안전감이 중요합니다.',
    concepts: '편도체(Amygdala), 코르티솔(스트레스 호르몬), 심리적 안전감, 정서 조절',
    application: '안전한 학습 환경 조성, 시험 불안 관리, 실패 허용 문화',
  },
  {
    name: '수면 & 신체',
    icon: '😴',
    tags: ['기억 고정화', 'BDNF'],
    description: '수면 중 해마가 낮에 학습한 내용을 장기 기억으로 전환합니다. 운동은 BDNF를 증가시켜 뉴런 생성을 촉진합니다.',
    concepts: '수면 기억 고정화, BDNF(뇌유래신경영양인자), 유산소 운동과 인지능력',
    application: '학습 시간대 추천, 시험 전 충분한 수면, 수업 전 가벼운 운동',
  },
  {
    name: '발달',
    icon: '🌱',
    tags: ['뇌 성숙도', '전두엽 발달'],
    description: '전두엽(계획, 판단, 충동 조절)은 25세까지 완전히 성숙하지 않습니다. 연령에 맞는 학습법이 중요합니다.',
    concepts: '뇌 성숙도, 시냅스 가지치기, 가소성(Neuroplasticity), 민감기',
    application: '연령별 적합한 자기주도 수준, 구조화된 학습 환경, 점진적 자율성',
  },
]
