import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { LessonPageContent } from '@/components/LessonPageContent';
import { FailedView } from '@/components/FailedView';
import { UploadedView } from '@/components/UploadedView';
import { notFound } from 'next/navigation';
import { getLessonWithTags } from '@/lib/db/lessons';

// Disable caching for this page
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { id } = await params;

  const lesson = await getLessonWithTags(id);

  if (!lesson) {
    notFound();
  }

  const sentences = await db
    .select()
    .from(schema.sentences)
    .where(eq(schema.sentences.lessonId, id))
    .orderBy(schema.sentences.idx);

  // Show different UI based on lesson status
  if (lesson.status === 'PROCESSING') {
    return <ProcessingStatus lessonId={id} />;
  }

  if (lesson.status === 'FAILED') {
    return <FailedView lesson={lesson} />;
  }

  if (lesson.status === 'UPLOADED') {
    return <UploadedView lesson={lesson} />;
  }

  // READY status
  return <LessonPageContent lesson={lesson} sentences={sentences} />;
}
