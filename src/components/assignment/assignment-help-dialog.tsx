"use client"

import { useState } from "react"
import { HelpCircle, Sparkles, Users, ArrowRightLeft, History, MessageCircleQuestion, LayoutDashboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AssignmentHelpDialog() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">도움말</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>배정 관리 가이드</DialogTitle>
          <DialogDescription>
            학생-선생님 배정의 모든 기능을 안내합니다
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="overview" className="text-xs">
              <LayoutDashboard className="h-3 w-3 mr-1 hidden sm:inline-block" />
              개요
            </TabsTrigger>
            <TabsTrigger value="smart" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1 hidden sm:inline-block" />
              스마트
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs">
              <ArrowRightLeft className="h-3 w-3 mr-1 hidden sm:inline-block" />
              배정작업
            </TabsTrigger>
            <TabsTrigger value="status" className="text-xs">
              <Users className="h-3 w-3 mr-1 hidden sm:inline-block" />
              현황
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3 w-3 mr-1 hidden sm:inline-block" />
              이력
            </TabsTrigger>
            <TabsTrigger value="faq" className="text-xs">
              <MessageCircleQuestion className="h-3 w-3 mr-1 hidden sm:inline-block" />
              FAQ
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[55vh] mt-4 pr-2">
            {/* 개요 탭 */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">배정 관리란?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  학생을 담당 선생님에게 배정하고 관리하는 페이지입니다.
                  사주, MBTI, 성명학 등 다양한 데이터를 기반으로 최적의 학생-선생님 매칭을 지원합니다.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">대시보드 카드</h3>
                <div className="space-y-2">
                  {[
                    {
                      title: "전체 학생",
                      desc: "시스템에 등록된 학생의 총 수와 배정 완료된 학생 수를 표시합니다.",
                    },
                    {
                      title: "미배정",
                      desc: "아직 선생님이 배정되지 않은 학생 수입니다. 주황색이면 배정이 필요하고, 초록색이면 모두 배정 완료입니다.",
                    },
                    {
                      title: "평균 담당 학생",
                      desc: "선생님 1인당 평균 담당 학생 수입니다. 이 수치가 너무 높으면 선생님의 부담이 클 수 있으므로 분산 배정을 고려하세요.",
                    },
                  ].map((card) => (
                    <div key={card.title} className="rounded-lg border p-3">
                      <span className="font-medium text-xs">{card.title}</span>
                      <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">전체 흐름</h3>
                <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">1단계</Badge>
                    <span>학생과 선생님이 시스템에 등록되어 있어야 합니다</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">2단계</Badge>
                    <span>스마트 배정으로 궁합을 분석하거나, 수동/일괄 배정으로 직접 배정합니다</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">3단계</Badge>
                    <span>배정 현황 테이블에서 결과를 확인하고, 필요시 배정을 해제하거나 변경합니다</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">4단계</Badge>
                    <span>이력 조회 탭에서 모든 배정/해제 기록을 감사(audit) 로그로 확인합니다</span>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* 스마트 배정 탭 */}
            <TabsContent value="smart" className="mt-0 space-y-4">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">스마트 배정이란?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  학생을 선택하면 모든 선생님과의 궁합 점수를 자동으로 계산하여 최적의 매칭을 추천합니다.
                  사주 오행, MBTI, 성명학, 학습 스타일, 부하 분산 등 다양한 요소를 종합적으로 분석합니다.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">사용 방법</h3>
                <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-xs">
                  <p><strong>1.</strong> <strong>미배정 학생</strong> 드롭다운에서 학생을 선택합니다 (이미 배정된 학생도 재배정 가능)</p>
                  <p><strong>2.</strong> <strong>계산 모델</strong>을 선택합니다 (아래 모델 비교 참조)</p>
                  <p><strong>3.</strong> <strong>분석</strong> 버튼을 클릭하면 궁합 분석이 시작됩니다</p>
                  <p><strong>4.</strong> 추천 목록에서 점수와 세부 항목을 확인합니다</p>
                  <p><strong>5.</strong> 원하는 선생님 옆의 <strong>배정하기</strong> 버튼을 클릭합니다</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">계산 모델 비교</h3>
                <div className="space-y-2">
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">기본 점수 모델 (Rule-based)</span>
                      <Badge variant="secondary" className="text-[10px]">기본</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      수학적 공식으로 궁합 점수를 계산합니다. 빠르고 일관된 결과를 제공하며 비용이 들지 않습니다.
                    </p>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">속도</span>
                      <span>즉시 (~1초)</span>
                      <span className="text-muted-foreground">비용</span>
                      <span>무료</span>
                      <span className="text-muted-foreground">배점</span>
                      <span>MBTI 25 + 학습스타일 25 + 사주 20 + 성명학 15 + 부하분산 15 = 100점</span>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">LLM 기반 분석 (AI 추천)</span>
                      <Badge className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200">AI</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI가 학생과 선생님의 데이터를 종합적으로 분석합니다. 특히 사주 궁합에 50%의 비중을 두어
                      깊이 있는 분석을 제공하며, 한국어로 구체적인 추천 이유를 설명합니다.
                    </p>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">속도</span>
                      <span>20~60초 (선생님 수에 따라 다름)</span>
                      <span className="text-muted-foreground">비용</span>
                      <span>토큰 사용량에 따라 비용 발생</span>
                      <span className="text-muted-foreground">배점</span>
                      <span>MBTI 20 + 학습스타일 10 + <strong>사주 50</strong> + 성명학 10 + 부하분산 10 = 100점</span>
                      <span className="text-muted-foreground">필요조건</span>
                      <span>관리자 &gt; LLM 제공자에서 1개 이상 활성화 필요</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-medium">팁</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>먼저 Rule-based로 빠르게 확인한 후, LLM 분석으로 깊이 있는 결과를 비교해 보세요</li>
                    <li>사주/MBTI/성명학 데이터가 없는 학생이나 선생님은 해당 항목 점수가 0점으로 계산됩니다</li>
                    <li>분석 데이터가 많을수록 더 정확한 추천을 받을 수 있습니다</li>
                  </ul>
                </div>
              </section>
            </TabsContent>

            {/* 배정 작업 탭 */}
            <TabsContent value="manual" className="mt-0 space-y-4">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">배정 작업 종류</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  스마트 배정 외에도 상황에 맞는 다양한 배정 방법을 제공합니다.
                </p>
              </section>

              <section className="space-y-2">
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">수동 배정</span>
                    <Badge variant="outline" className="text-[10px]">1:1</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    학생 1명을 선생님 1명에게 직접 배정합니다.
                  </p>
                  <div className="text-xs space-y-1">
                    <p><strong>사용법:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                      <li>배정 작업 카드에서 &quot;수동 배정&quot; 버튼 클릭</li>
                      <li>학생 드롭다운에서 배정할 학생 선택</li>
                      <li>선생님 드롭다운에서 담당 선생님 선택</li>
                      <li>&quot;배정&quot; 버튼 클릭</li>
                    </ol>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>적합한 경우:</strong> 특정 학생을 특정 선생님에게 배정해야 할 때, 학부모 요청 등
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">일괄 배정</span>
                    <Badge variant="outline" className="text-[10px]">N:1</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    여러 학생을 한 선생님에게 한 번에 배정합니다.
                  </p>
                  <div className="text-xs space-y-1">
                    <p><strong>사용법:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                      <li>배정 작업 카드에서 &quot;일괄 배정&quot; 버튼 클릭</li>
                      <li>담당 선생님을 먼저 선택</li>
                      <li>배정할 학생들을 복수 선택 (체크박스)</li>
                      <li>&quot;일괄 배정&quot; 버튼 클릭</li>
                    </ol>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>적합한 경우:</strong> 신규 학생 다수를 한 선생님에게 배정할 때, 학기 초 대량 배정 등
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">AI 자동 배정 제안</span>
                    <Badge className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200">AI</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    미배정 학생 전체를 대상으로 AI가 자동으로 최적의 배정 안을 생성합니다.
                    별도 페이지로 이동하여 사용합니다.
                  </p>
                  <div className="text-xs space-y-1">
                    <p><strong>사용법:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                      <li>배정 작업 카드에서 &quot;AI 자동 배정 제안&quot; 버튼 클릭</li>
                      <li>AI가 모든 미배정 학생에 대한 최적 배정안을 생성</li>
                      <li>제안된 배정안을 검토하고 승인/거부</li>
                    </ol>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>적합한 경우:</strong> 미배정 학생이 많을 때, 전체적인 최적 배분을 원할 때
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ※ 원장님, 팀장님만 사용할 수 있습니다
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* 배정 현황 탭 */}
            <TabsContent value="status" className="mt-0 space-y-4">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">선생님별 배정 현황</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  각 선생님이 담당하는 학생 목록을 테이블 형태로 확인할 수 있습니다.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">테이블 기능</h3>
                <div className="space-y-2">
                  {[
                    {
                      title: "정렬",
                      desc: "열 머리글을 클릭하면 오름차순/내림차순으로 정렬됩니다. 이름, 직급, 학생 수 등으로 정렬할 수 있습니다.",
                    },
                    {
                      title: "검색",
                      desc: "테이블 위의 검색창에서 선생님 이름으로 빠르게 검색할 수 있습니다.",
                    },
                    {
                      title: "학생 목록 확인",
                      desc: "각 행의 '학생' 열에서 담당 학생들의 이름, 학교, 학년을 확인할 수 있습니다.",
                    },
                    {
                      title: "선생님 상세",
                      desc: "선생님 이름을 클릭하면 해당 선생님의 상세 프로필 페이지로 이동합니다.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-lg border p-3">
                      <span className="font-medium text-xs">{item.title}</span>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">배정 해제</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  학생의 배정을 해제하려면 해당 학생의 상세 페이지에서 &quot;배정 해제&quot; 기능을 사용하거나,
                  수동 배정에서 다른 선생님으로 재배정할 수 있습니다.
                </p>
              </section>
            </TabsContent>

            {/* 이력 조회 탭 */}
            <TabsContent value="history" className="mt-0 space-y-4">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">배정 이력 조회</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  모든 배정 및 해제 기록을 시간순으로 확인할 수 있는 감사(audit) 로그입니다.
                  누가, 언제, 어떤 변경을 했는지 추적할 수 있습니다.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">필터 옵션</h3>
                <div className="space-y-2">
                  {[
                    {
                      title: "기간 검색",
                      desc: "시작일과 종료일을 지정하여 특정 기간의 배정 이력만 조회합니다.",
                    },
                    {
                      title: "선생님 필터",
                      desc: "특정 선생님과 관련된 배정 이력만 필터링합니다.",
                    },
                    {
                      title: "작업 유형",
                      desc: "배정(assign), 해제(unassign), 재배정(reassign) 등 작업 유형별로 필터링합니다.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-lg border p-3">
                      <span className="font-medium text-xs">{item.title}</span>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">상세 로그</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  각 이력 행을 클릭하면 상세 다이얼로그가 열리며, 배정 전후의 상태 변화,
                  변경 사유, 관련 학생/선생님 정보를 자세히 확인할 수 있습니다.
                </p>
              </section>

              <section>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-medium">팁</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>학기 말에 이력을 조회하여 배정 변경 횟수를 분석해 보세요</li>
                    <li>배정 이력은 삭제되지 않으며, 시스템에 영구 보관됩니다</li>
                  </ul>
                </div>
              </section>
            </TabsContent>

            {/* FAQ 탭 */}
            <TabsContent value="faq" className="mt-0 space-y-3">
              {/* TODO(human): FAQ 항목을 추가하세요. 아래 패턴을 참고하여 현장에서 자주 나오는 질문을 작성합니다. */}
              {[
                {
                  q: "미배정 학생이 보이지 않아요",
                  a: "학생 관리 페이지에서 학생이 정상 등록되어 있는지 확인하세요. 이미 선생님이 배정된 학생은 미배정 목록에 나타나지 않습니다. 재배정을 원하면 학생 검색에서 '배정된 학생 포함'을 활성화하세요.",
                },
                {
                  q: "스마트 배정에서 LLM 모델이 선택 안 돼요",
                  a: "관리자 > LLM 제공자 메뉴에서 최소 1개의 LLM 제공자를 등록하고 활성화해야 합니다. API 키가 유효한지, 연결 테스트가 성공했는지도 확인하세요.",
                },
                {
                  q: "궁합 점수가 모두 낮게 나와요",
                  a: "학생이나 선생님의 프로필 데이터(사주, MBTI, 성명학 등)가 비어 있으면 해당 항목의 점수가 0점이 됩니다. 프로필을 최대한 채워 넣으면 더 정확한 분석이 가능합니다.",
                },
                {
                  q: "AI 자동 배정 제안 기능이 비활성화돼요",
                  a: "이 기능은 원장님(DIRECTOR)과 팀장님(TEAM_LEADER) 권한으로만 사용할 수 있습니다. 권한이 없으면 일반 선생님 계정으로 로그인된 상태입니다.",
                },
                {
                  q: "배정을 했는데 취소하고 싶어요",
                  a: "학생 상세 페이지에서 배정 해제를 하거나, 수동 배정에서 다른 선생님으로 재배정할 수 있습니다. 모든 변경 사항은 이력 조회 탭에 기록됩니다.",
                },
                {
                  q: "선생님 간 학생 수 차이가 커요",
                  a: "스마트 배정의 궁합 점수에는 '부하 분산' 항목이 포함되어 있어 담당 학생이 적은 선생님에게 가산점이 부여됩니다. 일괄 배정 시에도 선생님별 담당 학생 수를 참고하여 균등하게 배분하세요.",
                },
                {
                  q: "LLM 분석에 시간이 너무 오래 걸려요",
                  a: "LLM 분석은 선생님 수에 따라 20~60초가 소요됩니다. 선생님이 많은 경우 시간이 더 걸릴 수 있습니다. 빠른 확인이 필요하면 먼저 Rule-based 모델로 분석하세요.",
                },
                {
                  q: "사주 데이터가 없는 학생도 분석 가능한가요?",
                  a: "네, 분석 가능합니다. 다만 사주 항목의 점수가 0점으로 처리되어 나머지 항목(MBTI, 학습스타일 등)만으로 점수가 산출됩니다. 생년월일시를 입력하면 자동으로 사주가 계산됩니다.",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Q</Badge>
                    <span className="font-medium text-xs">{item.q}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">A</Badge>
                    <span className="text-xs text-muted-foreground">{item.a}</span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
