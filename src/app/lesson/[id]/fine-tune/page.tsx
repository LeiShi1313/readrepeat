import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { FineTuneEditor } from '@/components/FineTuneEditor';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FineTunePage({ params }: Props) {
  const { id } = await params;

  const lesson = await db.query.lessons.findFirst({
    where: eq(schema.lessons.id, id),
  });

  if (!lesson) {
    notFound();
  }

  // Only allow fine-tuning for READY lessons
  if (lesson.status !== 'READY') {
    redirect(`/lesson/${id}`);
  }

  const sentences = await db
    .select()
    .from(schema.sentences)
    .where(eq(schema.sentences.lessonId, id))
    .orderBy(schema.sentences.idx);

  return (
    <FineTuneEditor
      lesson={lesson}
      sentences={sentences}
    />
  );
}
