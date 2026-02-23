"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, Users, GraduationCap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createTeamAction,
  updateTeamAction,
  deleteTeamAction,
} from "@/app/[locale]/(dashboard)/admin/teams/actions"

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

type TeamData = {
  id: string
  name: string
  createdAt: Date
  _count: { teachers: number; students: number }
}

type TeamsTabProps = {
  initialTeams: TeamData[]
  userRole: string
}

// ---------------------------------------------------------------------------
// 컴포넌트
// ---------------------------------------------------------------------------

export function TeamsTab({ initialTeams, userRole }: TeamsTabProps) {
  const [teams, setTeams] = useState<TeamData[]>(initialTeams)
  const [isPending, startTransition] = useTransition()

  // Dialog 상태
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [nameInput, setNameInput] = useState("")

  const isDirector = userRole === "DIRECTOR"

  // ── 생성 ──────────────────────────────────
  function openCreate() {
    setNameInput("")
    setCreateOpen(true)
  }

  function handleCreate() {
    if (!nameInput.trim()) return
    startTransition(async () => {
      const result = await createTeamAction(nameInput.trim())
      if (result.success) {
        setTeams((prev) => [
          ...prev,
          {
            id: result.data.id,
            name: result.data.name,
            createdAt: new Date(),
            _count: { teachers: 0, students: 0 },
          },
        ])
        toast.success("팀이 생성되었어요")
        setCreateOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  // ── 수정 ──────────────────────────────────
  function openEdit(team: TeamData) {
    setSelectedTeam(team)
    setNameInput(team.name)
    setEditOpen(true)
  }

  function handleUpdate() {
    if (!selectedTeam || !nameInput.trim()) return
    startTransition(async () => {
      const result = await updateTeamAction(selectedTeam.id, nameInput.trim())
      if (result.success) {
        setTeams((prev) =>
          prev.map((t) => (t.id === selectedTeam.id ? { ...t, name: result.data.name } : t)),
        )
        toast.success("팀 이름이 수정되었어요")
        setEditOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  // ── 삭제 ──────────────────────────────────
  function openDelete(team: TeamData) {
    setSelectedTeam(team)
    setDeleteOpen(true)
  }

  // TODO(human): 삭제 확인 후 실행하는 handleDelete 함수 구현
  function handleDelete() {
    if (!selectedTeam) return
    startTransition(async () => {
      const result = await deleteTeamAction(selectedTeam.id)
      if (result.success) {
        setTeams((prev) => prev.filter((t) => t.id !== selectedTeam.id))
        toast.success("팀이 삭제되었어요")
        setDeleteOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  // ── 렌더링 ────────────────────────────────
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">팀 목록</h2>
          <Badge variant="secondary">{teams.length}개</Badge>
        </div>
        {isDirector && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            팀 추가
          </Button>
        )}
      </div>

      {/* 테이블 또는 빈 상태 */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Users className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            아직 등록된 팀이 없어요.
            {isDirector && " 위의 '팀 추가' 버튼으로 첫 팀을 만들어보세요."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>팀 이름</TableHead>
                <TableHead className="text-center">선생님</TableHead>
                <TableHead className="text-center">학생</TableHead>
                <TableHead>생성일</TableHead>
                {isDirector && <TableHead className="text-right">관리</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {team._count.teachers}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      {team._count.students}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(team.createdAt).toLocaleDateString("ko-KR")}
                  </TableCell>
                  {isDirector && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(team)}
                          disabled={team._count.teachers > 0 || team._count.students > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── 생성 Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 팀 만들기</DialogTitle>
            <DialogDescription>팀 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="team-name-create">팀 이름</Label>
            <Input
              id="team-name-create"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="예: 1반, A팀"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !nameInput.trim()}>
              {isPending ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 수정 Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 이름 수정</DialogTitle>
            <DialogDescription>새 팀 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="team-name-edit">팀 이름</Label>
            <Input
              id="team-name-edit"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="팀 이름"
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdate} disabled={isPending || !nameInput.trim()}>
              {isPending ? "수정 중..." : "수정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 삭제 AlertDialog ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{selectedTeam?.name}&apos; 팀을 정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
