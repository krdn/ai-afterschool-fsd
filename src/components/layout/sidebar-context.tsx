"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type SidebarContextValue = {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  openMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const openMobile = useCallback(() => setMobileOpen(true), [])

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen, openMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}
