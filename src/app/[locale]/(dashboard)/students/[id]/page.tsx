import { getStudentById } from "@/lib/actions/student/detail";
import AnalysisTab from "@/components/students/tabs/analysis-tab";
import LearningTab from "@/components/students/tabs/learning-tab";
import MatchingTab from "@/components/students/tabs/matching-tab";
import CounselingTab from "@/components/students/tabs/counseling-tab";
import ReportTab from "@/components/students/tabs/report-tab";
import { notFound } from "next/navigation";
import StudentDetailActions from "@/components/students/student-detail-actions";
import Link from "next/link";
import { StudentImageType } from '@/lib/db';
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export default async function StudentDetailPage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ tab?: string; created?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const student = await getStudentById(params.id);
    const currentTab = searchParams.tab || 'learning';

    if (!student) {
        notFound();
    }

    const profileImage = student.images?.find(img => img.type === StudentImageType.profile);

    const isCreated = searchParams.created === 'true';
    const tabs = [
        { id: 'learning', label: '학습' },
        { id: 'analysis', label: '분석' },
        { id: 'matching', label: '매칭' },
        { id: 'counseling', label: '상담' },
        { id: 'report', label: '리포트' },
    ];

    return (
        <div className="container mx-auto py-8">
            <BreadcrumbNav items={[
                { label: "학생 목록", href: "/students" },
                { label: student.name },
            ]} />
            {isCreated && (
                <div className="bg-green-100 dark:bg-green-950/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
                    학생 등록이 완료되었습니다.
                </div>
            )}
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-6 items-center">
                    {profileImage ? (
                        <img
                            src={profileImage.resizedUrl}
                            alt="프로필 이미지"
                            className="w-24 h-24 rounded-full object-cover border profile"
                            data-testid="profile-image"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No Image</span>
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{student.name}</h1>
                        <p className="text-xl text-muted-foreground">{student.school} {student.grade}학년</p>
                    </div>
                </div>
                <StudentDetailActions id={student.id} />
            </div>

            <div className="bg-card border rounded-lg p-6 mb-6" data-testid="student-info">
                <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-muted-foreground">생년월일:</span> {new Date(student.birthDate).toLocaleDateString()}
                    </div>
                    <div>
                        <span className="text-muted-foreground">국적:</span> {student.nationality || "한국"}
                    </div>
                    <div>
                        <span className="text-muted-foreground">담당 선생님:</span> {student.teacher?.name}
                    </div>
                </div>
            </div>

            {student.parents && student.parents.length > 0 && (
                <div className="bg-card border rounded-lg p-6 mb-6" data-testid="parent-info">
                    <h2 className="text-xl font-semibold mb-4">보호자 정보</h2>
                    {student.parents.map(parent => (
                        <div key={parent.id} className="mb-2">
                            <p>{parent.name} ({parent.relation}) - {parent.phone}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-b mb-6" data-testid="student-detail-tabs">
                <div className="flex gap-4">
                    {tabs.map(tab => (
                        <Link
                            key={tab.id}
                            href={`/students/${student.id}?tab=${tab.id}`}
                            role="tab"
                            data-tab={tab.id}
                            data-testid={`${tab.id}-tab`}
                            className={`px-4 py-2 border-b-2 transition ${currentTab === tab.id ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent hover:border-gray-300'}`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="bg-card border rounded-lg p-6 min-h-[300px]">
                {currentTab === 'learning' && (
                    <LearningTab studentId={student.id} />
                )}
                {currentTab === 'analysis' && (
                    <AnalysisTab studentId={student.id} />
                )}
                {currentTab === 'matching' && (
                    <MatchingTab
                        studentId={student.id}
                        studentName={student.name}
                        currentTeacherId={student.teacherId}
                    />
                )}
                {currentTab === 'counseling' && (
                    <CounselingTab
                        studentId={student.id}
                        studentName={student.name}
                        teacherId={student.teacherId ?? ''}
                    />
                )}
                {currentTab === 'report' && (
                    <ReportTab studentId={student.id} studentName={student.name} />
                )}
            </div>
        </div>
    );
}
