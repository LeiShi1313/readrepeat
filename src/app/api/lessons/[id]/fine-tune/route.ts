import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface Timing {
  sentenceId: string;
  startMs: number;
  endMs: number;
}

interface CreateSentence {
  id: string;
  idx: number;
  foreignText: string;
  translationText: string;
  startMs: number;
  endMs: number;
}

interface Operations {
  deletes: string[];
  creates: CreateSentence[];
}

interface RequestBody {
  timings: Timing[];
  operations?: Operations;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const body: RequestBody = await request.json();
    const { timings, operations } = body;

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

    // Get existing sentences
    const existingSentences = await db
      .select({ id: schema.sentences.id })
      .from(schema.sentences)
      .where(eq(schema.sentences.lessonId, lessonId));

    const existingIds = new Set(existingSentences.map((s) => s.id));

    // Handle structural changes (merge/split) if present
    if (operations) {
      // 1. Delete sentences (from merges)
      if (operations.deletes && operations.deletes.length > 0) {
        for (const id of operations.deletes) {
          if (existingIds.has(id)) {
            await db.delete(schema.sentences).where(eq(schema.sentences.id, id));
            existingIds.delete(id);
          }
        }
      }

      // 2. Create new sentences (from splits/merges)
      if (operations.creates && operations.creates.length > 0) {
        for (const sent of operations.creates) {
          await db.insert(schema.sentences).values({
            id: sent.id,
            lessonId,
            idx: sent.idx,
            foreignText: sent.foreignText,
            translationText: sent.translationText,
            startMs: sent.startMs,
            endMs: sent.endMs,
            clipPath: null, // Will be set by reslice
            confidence: null,
          });
          existingIds.add(sent.id);
        }
      }
    }

    // Update sentence timings for existing sentences
    for (const timing of timings) {
      if (existingIds.has(timing.sentenceId)) {
        await db
          .update(schema.sentences)
          .set({
            startMs: timing.startMs,
            endMs: timing.endMs,
          })
          .where(eq(schema.sentences.id, timing.sentenceId));
      }
    }

    // Reindex all sentences by startMs
    const allSentences = await db
      .select()
      .from(schema.sentences)
      .where(eq(schema.sentences.lessonId, lessonId))
      .orderBy(asc(schema.sentences.startMs));

    for (let i = 0; i < allSentences.length; i++) {
      await db
        .update(schema.sentences)
        .set({ idx: i })
        .where(eq(schema.sentences.id, allSentences[i].id));
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
