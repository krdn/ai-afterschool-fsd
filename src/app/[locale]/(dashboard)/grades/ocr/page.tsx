import { getCurrentTeacher } from '@/lib/dal';
import OcrUploadPage from '@/components/grades/ocr-upload-page';

export default async function GradeOcrPage() {
  const teacher = await getCurrentTeacher();

  return <OcrUploadPage teacherId={teacher.id} />;
}
