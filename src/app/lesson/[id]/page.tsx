import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Player } from '@/components/Player';
import { ProcessingStatus } from '@/components/ProcessingStatus';
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
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm text-gray-500">Back to lessons</span>
        </div>
      </header>

      <main className="pt-4">
        <Player lesson={{ ...lesson, sentences }} />
      </main>
    </div>
  );
}

function FailedView({ lesson }: { lesson: typeof schema.lessons.$inferSelect }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Processing Failed</h2>
        <p className="text-gray-600 mb-4">
          {lesson.errorMessage || 'An error occurred while processing the audio.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
          <form action={`/api/lessons/${lesson.id}/reprocess`} method="POST">
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </form>
        </div>
      </div>
    </div>
  );
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
