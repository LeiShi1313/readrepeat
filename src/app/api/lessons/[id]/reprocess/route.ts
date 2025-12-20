import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;

    // Verify lesson exists and has audio
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (!lesson.audioOriginalPath) {
      return NextResponse.json({ error: 'No audio file uploaded for this lesson' }, { status: 400 });
    }

    // Update lesson status
    await db
      .update(schema.lessons)
      .set({
        status: schema.LESSON_STATUS.PROCESSING,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.lessons.id, lessonId));

    // Delete existing sentences
    await db.delete(schema.sentences).where(eq(schema.sentences.lessonId, lessonId));

    // Create new processing job
    const jobId = uuidv4();
    await db.insert(schema.jobs).values({
      id: jobId,
      type: 'PROCESS_LESSON',
      payloadJson: JSON.stringify({ lessonId }),
      status: schema.JOB_STATUS.PENDING,
    });

    return NextResponse.json({
      message: 'Reprocessing started',
      jobId,
    });
  } catch (error) {
    console.error('Error reprocessing lesson:', error);
    return NextResponse.json({ error: 'Failed to reprocess lesson' }, { status: 500 });
  }
}
