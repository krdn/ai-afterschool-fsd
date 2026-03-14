'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaginationNav } from '@/components/ui/pagination-nav';
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Search,
  ScanLine,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';

type Student = {
  id: string;
  name: string;
  school: string;
  grade: number;
  _count: {
    gradeHistory: number;
    mockExamResults: number;
  };
};

interface GradeDashboardProps {
  students: Student[];
  teacherRole: string;
  searchQuery?: string;
  stats?: {
    totalStudents: number;
    totalGradeHistory: number;
    totalMockExams: number;
  };
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
  };
}

export default function GradeDashboard({
  students,
  teacherRole,
  searchQuery = '',
  stats,
  pagination,
}: GradeDashboardProps) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">성적 관리</h1>
          <p className="text-muted-foreground">
            학생별 내신/모의고사 성적을 관리하고 분석합니다
          </p>
        </div>
        <Link href="/grades/ocr">
          <Button>
            <ScanLine className="w-4 h-4 mr-2" />
            OCR 성적 입력
          </Button>
        </Link>
      </div>

      {/* 요약 카드 */}
      <StatsCards
        stats={stats}
        students={students}
        teacherRole={teacherRole}
      />

      {/* 서버사이드 검색 */}
      <Suspense>
        <GradeSearch initialQuery={searchQuery} />
      </Suspense>

      {/* 학생 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>학교</TableHead>
                  <TableHead className="text-center">학년</TableHead>
                  <TableHead className="text-center">내신</TableHead>
                  <TableHead className="text-center">모의고사</TableHead>
                  <TableHead className="text-right">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {searchQuery
                        ? `'${searchQuery}'에 대한 검색 결과가 없습니다.`
                        : '담당 학생이 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.school}</TableCell>
                      <TableCell className="text-center">
                        {student.grade}학년
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            student._count.gradeHistory > 0
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {student._count.gradeHistory}건
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            student._count.mockExamResults > 0
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {student._count.mockExamResults}건
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/grades/${student.id}`}>
                          <Button variant="ghost" size="sm">
                            상세
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {pagination && (
        <Suspense>
          <PaginationNav
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
          />
        </Suspense>
      )}
    </div>
  );
}

// ============================================================================
// 통계 카드
// ============================================================================
function StatsCards({
  stats,
  students,
  teacherRole,
}: {
  stats?: GradeDashboardProps['stats'];
  students: Student[];
  teacherRole: string;
}) {
  const totalStudents = stats?.totalStudents ?? students.length;
  const totalGradeHistory =
    stats?.totalGradeHistory ??
    students.reduce((sum, s) => sum + s._count.gradeHistory, 0);
  const totalMockExams =
    stats?.totalMockExams ??
    students.reduce((sum, s) => sum + s._count.mockExamResults, 0);

  const studentsWithData = stats
    ? // stats가 있으면 비율 계산은 현재 페이지 기준은 의미 없으므로 전체 기준
      totalGradeHistory > 0 || totalMockExams > 0
      ? Math.round(
          ((totalGradeHistory + totalMockExams) /
            Math.max(1, totalStudents)) *
            100
        )
      : 0
    : (() => {
        const withData = students.filter(
          (s) => s._count.gradeHistory > 0 || s._count.mockExamResults > 0
        ).length;
        return totalStudents > 0
          ? Math.round((withData / totalStudents) * 100)
          : 0;
      })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            전체 학생 수
          </CardTitle>
          <Users className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}명</div>
          <p className="text-xs text-muted-foreground mt-1">
            {teacherRole === 'DIRECTOR'
              ? '전체 학원'
              : teacherRole === 'TEAM_LEADER' || teacherRole === 'MANAGER'
                ? '우리 팀'
                : '내 담당'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            내신 성적 건수
          </CardTitle>
          <BookOpen className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGradeHistory}건</div>
          <p className="text-xs text-muted-foreground mt-1">
            등록된 내신 성적 데이터
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            모의고사 건수
          </CardTitle>
          <FileText className="w-4 h-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMockExams}건</div>
          <p className="text-xs text-muted-foreground mt-1">
            등록된 모의고사 데이터
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            데이터 보유율
          </CardTitle>
          <BarChart3 className="w-4 h-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{studentsWithData}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            성적 데이터 보유 비율
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 서버사이드 검색
// ============================================================================
function GradeSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query === initialQuery) return;
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
          params.set('query', query.trim());
        } else {
          params.delete('query');
        }
        params.delete('page');
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, initialQuery, router, pathname, searchParams, startTransition]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="학생 이름 또는 학교로 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-10"
      />
      {isPending && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}
      {!isPending && query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="검색어 지우기"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
