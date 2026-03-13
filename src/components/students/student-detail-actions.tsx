"use client";

import { useState } from "react";
import { deleteStudent } from "@/lib/actions/student/detail";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function StudentDetailActions({ id }: { id: string }) {
    const router = useRouter();
    const [deleteOpen, setDeleteOpen] = useState(false);

    const handleDelete = async () => {
        await deleteStudent(id);
        toast.success("학생이 삭제되었습니다.");
        router.push("/students");
    };

    return (
        <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
                <Link data-testid="edit-button" href={`/students/${id}/edit`}>
                    편집
                </Link>
            </Button>
            <Button
                data-testid="delete-button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
            >
                삭제
            </Button>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="학생 삭제"
                description="정말로 이 학생의 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmLabel="삭제"
                onConfirm={handleDelete}
            />
        </div>
    );
}
