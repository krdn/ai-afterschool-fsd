# Sidebar Navigation Design Spec

## Summary

수평 헤더 네비게이션을 사이드바 + 슬림 헤더 구조로 전환하여 메뉴 그룹핑, 아이콘 지원, 활성 상태 표시, 모바일 대응을 구현한다.

## Problem

- 9개 메인 메뉴가 수평으로 나열되어 인지 부하 높음
- 모바일(768px 미만)에서 메뉴 완전 미노출
- 현재 페이지 표시 없음 (활성 메뉴 하이라이트 없음)
- 아이콘 없이 텍스트만 → 빠른 시각적 구분 불가
- `/dashboard`, `/teams` 경로가 메뉴에 없음

## Design

### Layout Structure

```
┌──────────────────────────────────────────────┐
│ [≡] AI AfterSchool    [알림][언어][사용자]   │  ← 슬림 헤더 (h-14)
├────────┬─────────────────────────────────────┤
│        │                                     │
│ Sidebar│  Main Content                       │  ← flex 레이아웃
│ (w-64) │  (flex-1)                           │
│        │                                     │
└────────┴─────────────────────────────────────┘
```

### Menu Groups (RBAC)

**Group 1: 메인** (all roles)
| Menu | Path | Icon | Label (ko/en) |
|------|------|------|---------------|
| Dashboard | /dashboard | LayoutDashboard | 대시보드 / Dashboard |
| Students | /students | Users | 학생 관리 / Students |
| Counseling | /counseling | MessageSquare | 상담 / Counseling |
| Grades | /grades | BookOpen | 성적 관리 / Grades |
| AI Chat | /chat | MessageCircle | AI 채팅 / AI Chat |

**Group 2: 관리** (DIRECTOR, TEAM_LEADER)
| Menu | Path | Icon | Label (ko/en) |
|------|------|------|---------------|
| Teachers | /teachers | UserCheck | 선생님 / Teachers |
| Matching | /matching | GitBranch | 매칭 / Matching |
| Analytics | /analytics | BarChart3 | 분석 / Analytics |
| Teams | /teams | Users2 | 팀 관리 / Teams |

**Group 3: 시스템** (DIRECTOR only, collapsible)
| Menu | Path | Icon | Label (ko/en) |
|------|------|------|---------------|
| Issues | /issues | AlertCircle | 이슈 / Issues |
| Admin | /admin | Settings | 관리자 도구 / Admin Tools |

### Components

1. **AppSidebar** (`src/components/layout/app-sidebar.tsx`) — Client Component
   - Props: `role`, `name`, `menuItems` (server에서 RBAC 필터링된 메뉴)
   - State: `collapsed` (localStorage), `mobileOpen` (Sheet)
   - `usePathname()`으로 활성 메뉴 판단

2. **SidebarNavItem** — 개별 메뉴 아이템
   - active: `bg-accent text-accent-foreground font-medium`
   - hover: `hover:bg-accent/50`
   - collapsed: 아이콘만 표시 + `title` 속성

3. **MobileSidebar** — Sheet(left) 래핑

4. **Header 슬림화** — 로고 + 햄버거(모바일) + 우측 도구(알림/언어/유저메뉴)

### Responsive Behavior

- **Desktop (≥1024px)**: 사이드바 고정, 접기/펼치기 가능
- **Tablet (768-1023px)**: 사이드바 기본 접힘(아이콘만)
- **Mobile (<768px)**: 사이드바 숨김, 햄버거 메뉴로 Sheet 열기

### Files Changed

- `src/components/layout/app-sidebar.tsx` (NEW)
- `src/app/[locale]/(dashboard)/layout.tsx` (MODIFIED)
- `src/messages/ko.json` (MODIFIED)
- `src/messages/en.json` (MODIFIED)
- `src/app/globals.css` (MODIFIED — sidebar CSS variables)

### Non-goals

- 사이드바 리사이즈 드래그
- 메뉴 즐겨찾기/커스터마이징
- 다단계 중첩 메뉴 (1단계 그룹핑만)
