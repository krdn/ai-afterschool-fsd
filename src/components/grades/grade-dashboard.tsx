'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Search,
  ScanLine,
  ChevronRight,
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
}

export default function GradeDashboard({
  students,
  teacherRole,
}: GradeDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.school.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // 요약 통계
  const totalStudents = students.length;
  const totalGradeHistory = students.reduce(
    (sum, s) => sum + s._count.gradeHistory,
    0
  );
  const totalMockExams = students.reduce(
    (sum, s) => sum + s._count.mockExamResults,
    0
  );
  const studentsWithData = students.filter(
    (s) => s._count.gradeHistory > 0 || s._count.mockExamResults > 0
  ).length;
  const dataRate =
    totalStudents > 0
      ? Math.round((studentsWithData / totalStudents) * 100)
      : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">성적 관리</h1>
          <p className="text-gray-600">
            학생별 내신/모의고사 성적을 관리하고 분석합니다
          </p>
        </div>
        <Link href="/grades/ocr">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <ScanLine className="w-4 h-4 mr-2" />
            OCR 성적 입력
          </Button>
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              전체 학생 수
            </CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}명</div>
            <p className="text-xs text-gray-500 mt-1">
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
            <CardTitle className="text-sm font-medium text-gray-600">
              내신 성적 건수
            </CardTitle>
            <BookOpen className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGradeHistory}건</div>
            <p className="text-xs text-gray-500 mt-1">
              등록된 내신 성적 데이터
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              모의고사 건수
            </CardTitle>
            <FileText className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMockExams}건</div>
            <p className="text-xs text-gray-500 mt-1">
              등록된 모의고사 데이터
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              데이터 보유율
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {studentsWithData}/{totalStudents}명 데이터 보유
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="학생 이름 또는 학교로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 학생 테이블 */}
      <Card>
        <CardContent className="p-0">
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
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    {searchQuery
                      ? '검색 결과가 없습니다.'
                      : '담당 학생이 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
