"use client"

import Link from "next/link"
import { logout } from "@/lib/actions/auth/login"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, ChevronDown } from "lucide-react"

type UserMenuProps = {
  name: string
  role: string
}

const roleLabels: Record<string, string> = {
  DIRECTOR: "원장",
  TEAM_LEADER: "팀장",
  MANAGER: "매니저",
  TEACHER: "선생님",
}

export function UserMenu({ name, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <span className="text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">
            {roleLabels[role] ?? role}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link href="/teachers/me" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            내 정보
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={logout} className="w-full">
            <button type="submit" className="flex items-center gap-2 w-full">
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
