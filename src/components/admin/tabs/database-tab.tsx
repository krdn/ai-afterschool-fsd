'use client'

import { useState, useTransition } from 'react'
import { runDemoSeedAction } from '@/lib/actions/admin/database'
import {
  ALL_SEED_GROUPS,
  SEED_GROUP_DEPENDENCIES,
  SEED_GROUP_LABELS,
  SEED_GROUP_COUNTS,
  type SeedGroup,
  type SeedMode,
} from '@/lib/db/seed-constants'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Database, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

type DatabaseTabProps = {
  userRole?: string
}

export function DatabaseTab({ userRole }: DatabaseTabProps) {
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // 그룹 선택 상태
  const [selectedGroups, setSelectedGroups] = useState<Set<SeedGroup>>(new Set(ALL_SEED_GROUPS))
  const [modes, setModes] = useState<Record<SeedGroup, SeedMode>>(
    Object.fromEntries(ALL_SEED_GROUPS.map((g) => [g, 'merge'])) as Record<SeedGroup, SeedMode>
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isDirector = userRole === 'DIRECTOR'

  // 리셋에 의해 자동 강제된 그룹 계산
  const forcedResetGroups = new Set<SeedGroup>()
  for (const group of selectedGroups) {
    if (modes[group] === 'reset') {
      for (const dep of SEED_GROUP_DEPENDENCIES[group]) {
        forcedResetGroups.add(dep)
      }
    }
  }

  const hasReset = [...selectedGroups].some((g) => modes[g] === 'reset')

  function toggleGroup(group: SeedGroup, checked: boolean) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(group)
      } else {
        next.delete(group)
      }
      return next
    })
  }

  function toggleMode(group: SeedGroup, mode: SeedMode) {
    setModes((prev) => {
      const next = { ...prev, [group]: mode }
      // 리셋 선택 시 하위 의존 그룹도 자동 리셋
      if (mode === 'reset') {
        for (const dep of SEED_GROUP_DEPENDENCIES[group]) {
          next[dep] = 'reset'
        }
      }
      return next
    })
  }

  function resetDialogState() {
    setPassword('')
    setShowPassword(false)
    setSelectedGroups(new Set(ALL_SEED_GROUPS))
    setModes(
      Object.fromEntries(ALL_SEED_GROUPS.map((g) => [g, 'merge'])) as Record<SeedGroup, SeedMode>
    )
  }

  function handleDemoSeed() {
    if (!password) {
      toast.error('비밀번호를 입력해주세요')
      return
    }
    startTransition(async () => {
      const groups = [...selectedGroups]
      const modeMap = Object.fromEntries(
        groups.map((g) => [g, modes[g]])
      ) as Partial<Record<SeedGroup, SeedMode>>

      const result = await runDemoSeedAction({ groups, modes: modeMap }, password)
      setSeedDialogOpen(false)
      resetDialogState()

      if (result.success) {
        const data = result.data as Record<string, { created: number; updated: number }>
        const total = Object.values(data).reduce(
          (acc, v) => ({ created: acc.created + v.created, updated: acc.updated + v.updated }),
          { created: 0, updated: 0 }
        )
        toast.success(
          `시드 완료: ${total.created}건 생성, ${total.updated}건 갱신`,
          {
            description: Object.entries(data)
              .filter(([, v]) => v.created > 0 || v.updated > 0)
              .map(([k, v]) => `${k}: +${v.created} / ~${v.updated}`)
              .join(', '),
            duration: 8000,
          }
        )
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-6" data-testid="database-tab">
      {/* 데모 데이터 관리 (DIRECTOR만) */}
      {isDirector && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <Database className="w-4 h-4" />
                데모 데이터 관리
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                데모/개발용 시드 데이터를 선택적으로 로드하거나 리셋합니다.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSeedDialogOpen(true)}
              disabled={isPending}
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  실행 중...
                </>
              ) : (
                '데모 데이터 관리'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 데모 데이터 관리 다이얼로그 */}
      <AlertDialog open={seedDialogOpen} onOpenChange={(open) => {
        setSeedDialogOpen(open)
        if (!open) resetDialogState()
      }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>데모 데이터 관리</AlertDialogTitle>
            <AlertDialogDescription>
              시드 데이터를 선택적으로 로드합니다. 각 그룹별로 추가/갱신 또는 리셋을 선택하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* 그룹 선택 + 모드 */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {ALL_SEED_GROUPS.map((group) => {
              const isSelected = selectedGroups.has(group)
              const isForced = forcedResetGroups.has(group)
              const currentMode = modes[group]

              return (
                <div
                  key={group}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isSelected ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <Checkbox
                    id={`group-${group}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => toggleGroup(group, !!checked)}
                  />
                  <Label htmlFor={`group-${group}`} className="flex-1 text-sm cursor-pointer">
                    {SEED_GROUP_LABELS[group]}{' '}
                    <span className="text-muted-foreground">({SEED_GROUP_COUNTS[group]}건)</span>
                  </Label>

                  {isSelected && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleMode(group, 'merge')}
                        disabled={isForced}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${currentMode === 'merge'
                          ? 'bg-green-100 text-green-800 font-medium'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          } ${isForced ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        추가/갱신
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMode(group, 'reset')}
                        className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${currentMode === 'reset'
                          ? 'bg-red-100 text-red-800 font-medium'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                      >
                        리셋
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 리셋 경고 */}
          {hasReset && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">
                리셋 선택된 그룹의 <strong>모든 기존 데이터가 삭제</strong>됩니다.
                관련 분석 결과, 상담 기록 등도 함께 삭제됩니다.
              </p>
            </div>
          )}

          {/* 비밀번호 입력 */}
          <div className="space-y-2">
            <Label htmlFor="admin-password">관리자 비밀번호</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && selectedGroups.size > 0 && !isPending) {
                    handleDemoSeed()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDemoSeed}
              disabled={isPending || selectedGroups.size === 0 || !password}
              className={hasReset ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  실행 중...
                </>
              ) : hasReset ? (
                '리셋 포함 실행'
              ) : (
                '시드 실행'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
