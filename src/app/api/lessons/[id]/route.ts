import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;

    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lessonSentences = await db
      .select()
      .from(schema.sentences)
      .where(eq(schema.sentences.lessonId, lessonId))
      .orderBy(schema.sentences.idx);

    return NextResponse.json({
      ...lesson,
      sentences: lessonSentences,
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const body = await request.json();

    // Verify lesson exists
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Only allow editing in READY or FAILED states
    if (lesson.status !== 'READY' && lesson.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Cannot edit lesson while processing' },
        { status: 400 }
      );
    }

    // Extract updatable fields
    const { title, foreignText, translationText, foreignLang, translationLang, whisperModel } = body;

    // Check if content changed that requires reprocessing
    const textChanged =
      (foreignText !== undefined && foreignText !== lesson.foreignTextRaw) ||
      (translationText !== undefined && translationText !== lesson.translationTextRaw);
    const modelChanged = whisperModel !== undefined && whisperModel !== lesson.whisperModel;
    const needsReprocessing = textChanged || modelChanged;

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (foreignText !== undefined) updates.foreignTextRaw = foreignText;
    if (translationText !== undefined) updates.translationTextRaw = translationText;
    if (foreignLang !== undefined) updates.foreignLang = foreignLang;
    if (translationLang !== undefined) updates.translationLang = translationLang;
    if (whisperModel !== undefined) updates.whisperModel = whisperModel;

    let jobId: string | null = null;

    // If text or model changed and audio exists, trigger reprocessing
    if (needsReprocessing && lesson.audioOriginalPath) {
      updates.status = schema.LESSON_STATUS.PROCESSING;
      updates.errorMessage = null;

      // Delete existing sentences
      await db.delete(schema.sentences).where(eq(schema.sentences.lessonId, lessonId));

      // Create processing job
      jobId = uuidv4();
      await db.insert(schema.jobs).values({
        id: jobId,
        type: 'PROCESS_LESSON',
        payloadJson: JSON.stringify({ lessonId }),
        status: schema.JOB_STATUS.PENDING,
      });
    }

    // Update lesson
    await db
      .update(schema.lessons)
      .set(updates)
      .where(eq(schema.lessons.id, lessonId));

    return NextResponse.json({
      message: 'Lesson updated',
      reprocessing: needsReprocessing && !!lesson.audioOriginalPath,
      jobId,
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
  }
}
