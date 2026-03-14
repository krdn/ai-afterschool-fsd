import { getCurrentTeacher } from '@/lib/dal';
import OcrUploadPage from '@/components/grades/ocr-upload-page';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

export default async function GradeOcrPage() {
  const teacher = await getCurrentTeacher();

  return (
    <div className="space-y-2">
      <BreadcrumbNav items={[
        { label: "성적 관리", href: "/grades" },
        { label: "OCR 성적 입력" },
      ]} />
      <OcrUploadPage teacherId={teacher.id} />
    </div>
  );
}
