'use client';

import * as React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface HelpButtonProps {
  onClick?: () => void;
  badge?: number;
  className?: string;
}

/**
 * 도움말 FAB (Floating Action Button)
 *
 * 화면 우측 하단에 고정되어 도움말 센터를 여는 버튼입니다.
 */
export function HelpButton({ onClick, badge, className }: HelpButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        'fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg hover:shadow-xl',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'transition-all duration-300 ease-in-out',
        'z-50',
        className
      )}
    >
      <HelpCircle className="h-6 w-6" />
      <span className="sr-only">도움말 센터 열기</span>

      {/* 읽지 않은 알림 배지 */}
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center animate-in zoom-in duration-200">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Button>
  );
}

export default HelpButton;
