"use client"

import { logout } from "@/lib/actions/auth/login"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" type="submit" data-testid="logout-button">
        로그아웃
      </Button>
    </form>
  )
}
