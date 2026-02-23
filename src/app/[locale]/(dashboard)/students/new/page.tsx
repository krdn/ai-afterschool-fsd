import StudentForm from "@/components/students/student-form";

export default function NewStudentPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">신규 학생 등록</h1>
            <StudentForm />
        </div>
    );
}
