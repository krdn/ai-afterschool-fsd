"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Plus, X, MessageSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
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
import { deleteChatSession } from "@/lib/actions/chat/sessions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Session = {
  id: string
  title: string | null
  updatedAt: Date
  messageCount: number
}

type ChatSidebarProps = {
  sessions: Session[]
  currentSessionId?: string
  onSessionsChange?: () => void
}

function groupSessionsByDate(sessions: Session[], t: (key: string) => string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: { label: string; sessions: Session[] }[] = []
  const todaySessions: Session[] = []
  const yesterdaySessions: Session[] = []
  const olderSessions: Session[] = []

  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    if (d >= today) todaySessions.push(s)
    else if (d >= yesterday) yesterdaySessions.push(s)
    else olderSessions.push(s)
  }

  if (todaySessions.length) groups.push({ label: t("today"), sessions: todaySessions })
  if (yesterdaySessions.length) groups.push({ label: t("yesterday"), sessions: yesterdaySessions })
  if (olderSessions.length) groups.push({ label: t("older"), sessions: olderSessions })

  return groups
}

function SidebarContent({
  sessions,
  currentSessionId,
  onSessionsChange,
  onClose,
}: ChatSidebarProps & { onClose?: () => void }) {
  const t = useTranslations("LLMChat")
  const router = useRouter()
  const groups = groupSessionsByDate(sessions, t)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleNewChat = () => {
    router.push("/chat")
    onClose?.()
  }

  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat/${sessionId}`)
    onClose?.()
  }

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string, title: string) => {
    e.stopPropagation()
    setDeleteTarget({ id: sessionId, title })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteChatSession(deleteTarget.id)
      onSessionsChange?.()
      if (currentSessionId === deleteTarget.id) {
        router.push("/chat")
      }
    } catch {
      toast.error(t("errorGeneric"))
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          {t("newChat")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-2">
          {groups.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              {t("noHistory")}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-xs font-medium text-gray-400 px-2 py-1">
                {group.label}
              </p>
              {group.sessions.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSession(s.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleSelectSession(s.id)}
                  className={cn(
                    "w-full min-w-0 flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left hover:bg-gray-100 group transition-colors cursor-pointer",
                    currentSessionId === s.id && "bg-gray-100 font-medium"
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1 min-w-0">
                    {s.title || t("emptyChatTitle")}
                  </span>
                  <button
                    onClick={(e) => handleDeleteClick(e, s.id, s.title || t("emptyChatTitle"))}
                    className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-white hover:bg-red-500 transition-colors"
                    title={t("deleteChat")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteChat")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteChatConfirm", { title: deleteTarget?.title || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("deleteChatCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t("deleting") : t("deleteChatAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function ChatSidebar(props: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* 데스크탑 사이드바 */}
      <div className="hidden md:flex">
        {!collapsed ? (
          <div className="w-[260px] border-r bg-gray-50/50 flex flex-col h-full relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(true)}
              className="absolute top-3 right-2 h-7 w-7 p-0 z-10"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <SidebarContent {...props} />
          </div>
        ) : (
          <div className="w-12 border-r bg-gray-50/50 flex flex-col items-center py-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(false)}
              className="h-8 w-8 p-0"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 모바일 Sheet */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-20 left-2 z-40 h-9 w-9 p-0 bg-white shadow-md border"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SidebarContent {...props} onClose={() => {}} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
