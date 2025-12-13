import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { LessonPageContent } from '@/components/LessonPageContent';
import { FailedView } from '@/components/FailedView';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Disable caching for this page
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { id } = await params;

  const lesson = await db.query.lessons.findFirst({
    where: eq(schema.lessons.id, id),
  });

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

function UploadedView({ lesson }: { lesson: typeof schema.lessons.$inferSelect }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Waiting for Audio</h2>
        <p className="text-gray-600 mb-4">
          This lesson is waiting for audio to be uploaded and processed.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
