import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface AdminPageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

/**
 * Admin 페이지 공통 레이아웃
 *
 * breadcrumbs + 페이지 헤더 + 콘텐츠를 제공합니다.
 * 상단 네비게이션은 /admin/layout.tsx에서 처리합니다.
 */
export function AdminPageLayout({
  children,
  title,
  description,
  breadcrumbs,
  actions,
}: AdminPageLayoutProps) {
  return (
    <div>
      {/* 브레드크럼 네비게이션 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 mb-6 text-sm">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            관리자
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {children}
    </div>
  );
}
