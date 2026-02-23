import { getStudents } from "@/lib/actions/student/detail";
import Link from "next/link";
import Image from "next/image";

const avatarColors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
];

function StudentAvatar({ student }: { student: { name: string; images?: Array<{ type: string; resizedUrl: string }> } }) {
    const profileImage = student.images?.find((img) => img.type === "profile");

    if (profileImage) {
        return (
            <Image
                src={profileImage.resizedUrl}
                alt={`${student.name} 프로필`}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                unoptimized
            />
        );
    }

    const initial = student.name.charAt(0);
    const colorIndex = student.name.charCodeAt(0) % avatarColors.length;

    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${avatarColors[colorIndex]}`}>
            {initial}
        </div>
    );
}

export default async function StudentsPage(props: {
    searchParams?: Promise<{ query?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.query || "";
    const students = await getStudents(query);

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">학생 목록</h1>
                <Link href="/students/new" className="bg-blue-600 text-white px-4 py-2 rounded" data-testid="add-student-button">
                    학생 등록
                </Link>
            </div>

            <div className="mb-6">
                <form className="flex gap-2">
                    <input
                        type="text"
                        name="query"
                        defaultValue={query}
                        placeholder="학생 이름 검색..."
                        className="border p-2 rounded w-full max-w-sm"
                        data-testid="student-search-input"
                    />
                    <button type="submit" className="bg-gray-200 px-4 py-2 rounded" data-testid="student-search-button">검색</button>
                </form>
            </div>

            {students.length === 0 ? (
                <p className="text-gray-500" data-testid="no-students-message">등록된 학생이 없습니다.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                        <Link key={student.id} href={`/students/${student.id}`} className="block">
                            <div data-testid="student-card" className="border p-4 rounded hover:shadow-lg transition bg-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <StudentAvatar student={student} />
                                    <h3 data-testid="student-name" className="text-xl font-semibold">{student.name}</h3>
                                </div>
                                <div className="text-gray-600 space-y-1">
                                    <span data-testid="student-school">{student.school}</span>
                                    <span> </span>
                                    <span data-testid="student-grade">{student.grade}학년</span>
                                    <p className="text-sm text-gray-500">
                                        생년월일: {new Date(student.birthDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
