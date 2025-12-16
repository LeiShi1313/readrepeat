import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface Timing {
  sentenceId: string;
  startMs: number;
  endMs: number;
}

interface RequestBody {
  timings: Timing[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const body: RequestBody = await request.json();
    const { timings } = body;

    // Validate request
    if (!timings || !Array.isArray(timings)) {
      return NextResponse.json(
        { error: 'Invalid request: timings array required' },
        { status: 400 }
      );
    }

    // Get lesson
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Only allow fine-tuning for READY lessons
    if (lesson.status !== schema.LESSON_STATUS.READY) {
      return NextResponse.json(
        { error: 'Lesson must be in READY status to fine-tune' },
        { status: 400 }
      );
    }

    // Validate all sentence IDs belong to this lesson
    const existingSentences = await db
      .select({ id: schema.sentences.id })
      .from(schema.sentences)
      .where(eq(schema.sentences.lessonId, lessonId));

    const existingIds = new Set(existingSentences.map((s) => s.id));

    for (const timing of timings) {
      if (!existingIds.has(timing.sentenceId)) {
        return NextResponse.json(
          { error: `Sentence ${timing.sentenceId} does not belong to this lesson` },
          { status: 400 }
        );
      }
    }

    // Update sentence timings in database
    for (const timing of timings) {
      await db
        .update(schema.sentences)
        .set({
          startMs: timing.startMs,
          endMs: timing.endMs,
        })
        .where(eq(schema.sentences.id, timing.sentenceId));
    }

    // Create RESLICE_AUDIO job
    const jobId = uuidv4();
    await db.insert(schema.jobs).values({
      id: jobId,
      type: 'RESLICE_AUDIO',
      payloadJson: JSON.stringify({ lessonId }),
      status: schema.JOB_STATUS.PENDING,
    });

    // Update lesson status to PROCESSING
    await db
      .update(schema.lessons)
      .set({
        status: schema.LESSON_STATUS.PROCESSING,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.lessons.id, lessonId));

    return NextResponse.json({
      message: 'Re-slicing started',
      jobId,
    });
  } catch (error) {
    console.error('Error saving fine-tune:', error);
    return NextResponse.json(
      { error: 'Failed to save fine-tune changes' },
      { status: 500 }
    );
  }
}
