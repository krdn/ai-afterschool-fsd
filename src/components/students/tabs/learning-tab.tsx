'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TrendingUp, BookOpen } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { addGrade, getGrades, deleteGrade } from "@/lib/actions/student/grade";
import { toast } from "sonner";
import { format } from "date-fns";
import { GradeType } from '@/lib/db';

// 성적 타입 정의
interface Grade {
    id: string;
    studentId: string;
    subject: string;
    score: number;
    gradeType: GradeType;
    testDate: Date;
    academicYear: number;
    semester: number;
}

export default function LearningTab({ studentId }: { studentId: string }) {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [open, setOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // 데이터 로드
    const loadGrades = async () => {
        const data = await getGrades(studentId);
        setGrades(data as Grade[]);
    };

    useEffect(() => {
        loadGrades();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    // 성적 추가 핸들러
    const handleAddGrade = async (formData: FormData) => {
        formData.append('studentId', studentId);

        // 강제 날짜 처리 (YYYY-MM-DD -> Date object는 서버에서 변환)
        // 폼 데이터 그대로 전송

        const result = await addGrade(null, formData);
        if (result.success) {
            toast.success(result.message);
            setOpen(false);
            loadGrades(); // 리로드
        } else {
            toast.error(result.message || "오류가 발생했습니다.");
        }
    };

    // 성적 삭제 핸들러
    const handleDelete = async () => {
        if (!deleteTarget) return;
        const result = await deleteGrade(deleteTarget, studentId);
        if (result.success) {
            toast.success("삭제되었습니다.");
            loadGrades();
        } else {
            toast.error("삭제 실패");
        }
        setDeleteTarget(null);
    };

    // 차트 데이터 가공 (날짜별 과목 점수)
    // Recharts는 [{ name: 'Date', 국어: 80, 수학: 90 }] 형태여야 함.
    // 데이터를 날짜순으로 정렬 후 가공
    const chartData = [...grades].sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime())
        .map(g => ({
            date: format(new Date(g.testDate), 'MM.dd'),
            [g.subject]: g.score,
            fullData: g // 툴팁용
        }));

    // 과목 리스트 추출 (라인 생성을 위해)
    const subjects = Array.from(new Set(grades.map(g => g.subject)));
    const colors = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea"]; // 색상 팔레트

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. 성적 추이 차트 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        성적 변화 추이
                    </CardTitle>
                    <CardDescription>최근 시험 성적 변화를 과목별로 확인할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {grades.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                {subjects.map((sub, idx) => (
                                    <Line
                                        key={sub}
                                        type="monotone"
                                        dataKey={sub}
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth={2}
                                        connectNulls // 데이터가 끊겨도 연결
                                        activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>입력된 성적 데이터가 없습니다.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. 성적 목록 및 추가 */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-green-600" />
                            성적 이력
                        </CardTitle>
                        <CardDescription>등록된 모든 시험 성적입니다.</CardDescription>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-1" />
                                성적 추가
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form action={handleAddGrade}>
                                <DialogHeader>
                                    <DialogTitle>새 성적 추가</DialogTitle>
                                    <DialogDescription>
                                        시험 결과 점수를 입력해주세요.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="subject" className="text-right">과목</Label>
                                        <Input id="subject" name="subject" placeholder="예: 수학" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="score" className="text-right">점수</Label>
                                        <Input id="score" name="score" type="number" min="0" max="100" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="gradeType" className="text-right">유형</Label>
                                        <Select name="gradeType" defaultValue="MIDTERM">
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="시험 유형" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MIDTERM">중간고사</SelectItem>
                                                <SelectItem value="FINAL">기말고사</SelectItem>
                                                <SelectItem value="QUIZ">쪽지시험</SelectItem>
                                                <SelectItem value="ASSIGNMENT">수행평가</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="testDate" className="text-right">날짜</Label>
                                        <Input id="testDate" name="testDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="semester" className="text-right">학기</Label>
                                        <Select name="semester" defaultValue="1">
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="학기 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1학기</SelectItem>
                                                <SelectItem value="2">2학기</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">저장하기</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>날짜</TableHead>
                                <TableHead>시험 유형</TableHead>
                                <TableHead>과목</TableHead>
                                <TableHead>점수</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grades.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        데이터가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                grades.map((grade) => (
                                    <TableRow key={grade.id}>
                                        <TableCell>{format(new Date(grade.testDate), 'yyyy.MM.dd')}</TableCell>
                                        <TableCell>
                                            {grade.gradeType === 'MIDTERM' ? '중간고사' :
                                                grade.gradeType === 'FINAL' ? '기말고사' :
                                                    grade.gradeType === 'QUIZ' ? '쪽지시험' : '수행평가'}
                                        </TableCell>
                                        <TableCell className="font-medium">{grade.subject}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-bold ${grade.score >= 90 ? 'bg-green-100 text-green-700' :
                                                    grade.score >= 80 ? 'bg-blue-100 text-blue-700' :
                                                        grade.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                }`}>
                                                {grade.score}점
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => setDeleteTarget(grade.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="성적 삭제"
                description="이 성적 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmLabel="삭제"
                onConfirm={handleDelete}
            />
        </div>
    );
}
