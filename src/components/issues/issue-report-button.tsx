'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IssueReportModal } from './issue-report-modal'

interface IssueReportButtonProps {
  userRole: string
}

export function IssueReportButton({ userRole }: IssueReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2"
      >
        <Flag className="h-4 w-4" />
        <span>이슈 보고</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="md:hidden"
        aria-label="이슈 보고"
      >
        <Flag className="h-5 w-5" />
      </Button>
      <IssueReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userRole={userRole}
      />
    </>
  )
}
