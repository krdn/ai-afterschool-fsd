import StudentForm from "@/components/students/student-form";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export default function NewStudentPage() {
    return (
        <div className="container mx-auto py-8">
            <BreadcrumbNav items={[
                { label: "학생 목록", href: "/students" },
                { label: "신규 학생 등록" },
            ]} />
            <h1 className="text-2xl font-bold mb-6">신규 학생 등록</h1>
            <StudentForm />
        </div>
    );
}
