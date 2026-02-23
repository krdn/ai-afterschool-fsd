"use client";

import { deleteStudent } from "@/lib/actions/student/detail";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function StudentDetailActions({ id }: { id: string }) {
    const router = useRouter();

    const handleDelete = async () => {
        if (confirm("정말로 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            await deleteStudent(id);
            toast.success("학생이 삭제되었습니다.");
            router.push("/students");
        }
    };

    return (
        <div className="flex gap-2">
            <Link
                data-testid="edit-button"
                href={`/students/${id}/edit`}
                className="bg-gray-200 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300 transition"
            >
                편집
            </Link>
            <button
                data-testid="delete-button"
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition"
            >
                삭제
            </button>
        </div>
    )
}
