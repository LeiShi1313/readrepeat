import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET: Claim a pending job (called by worker)
export async function GET() {
  try {
    // Find oldest pending job and claim it atomically
    const pendingJobs = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.status, schema.JOB_STATUS.PENDING))
      .orderBy(schema.jobs.createdAt)
      .limit(1);

    if (pendingJobs.length === 0) {
      return NextResponse.json({ job: null });
    }

    const job = pendingJobs[0];

    // Mark as processing
    await db
      .update(schema.jobs)
      .set({
        status: schema.JOB_STATUS.PROCESSING,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.jobs.id, job.id));

    // Get associated lesson data for the job
    const payload = JSON.parse(job.payloadJson);
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, payload.lessonId),
    });

    // For RESLICE_AUDIO jobs, include sentence data with updated timings
    let sentences = null;
    if (job.type === 'RESLICE_AUDIO') {
      sentences = await db
        .select()
        .from(schema.sentences)
        .where(eq(schema.sentences.lessonId, payload.lessonId))
        .orderBy(schema.sentences.idx);
    }

    return NextResponse.json({
      job: {
        ...job,
        payload,  // Include parsed payload for TTS jobs
        lesson,
        sentences,
      },
    });
  } catch (error) {
    console.error('Error polling jobs:', error);
    return NextResponse.json({ error: 'Failed to poll jobs' }, { status: 500 });
  }
}

// POST: Update job status (called by worker)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, status, errorMessage, sentences, jobType, updatedSentences } = body;

    // Update job status
    await db
      .update(schema.jobs)
      .set({
        status,
        errorMessage,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.jobs.id, jobId));

    // Get job to find lessonId
    const job = await db.query.jobs.findFirst({
      where: eq(schema.jobs.id, jobId),
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const payload = JSON.parse(job.payloadJson);
    const lessonId = payload.lessonId;

    // Handle RESLICE_AUDIO completion - just update clip paths
    if (status === schema.JOB_STATUS.COMPLETED && jobType === 'RESLICE_AUDIO' && updatedSentences) {
      for (const sent of updatedSentences) {
        await db
          .update(schema.sentences)
          .set({ clipPath: sent.clipPath })
          .where(eq(schema.sentences.id, sent.id));
      }

      // Update lesson status to READY
      await db
        .update(schema.lessons)
        .set({
          status: schema.LESSON_STATUS.READY,
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.lessons.id, lessonId));

      return NextResponse.json({ success: true });
    }

    // Handle PROCESS_LESSON or GENERATE_TTS_LESSON completion - insert new sentences
    if (status === schema.JOB_STATUS.COMPLETED && sentences && Array.isArray(sentences)) {
      // Delete existing sentences
      await db.delete(schema.sentences).where(eq(schema.sentences.lessonId, lessonId));

      // Insert new sentences
      for (const sent of sentences) {
        await db.insert(schema.sentences).values({
          id: sent.id,
          lessonId: lessonId,
          idx: sent.idx,
          foreignText: sent.foreignText,
          translationText: sent.translationText,
          startMs: sent.startMs,
          endMs: sent.endMs,
          clipPath: sent.clipPath,
          confidence: sent.confidence,
        });
      }

      // For TTS jobs, also update the audioOriginalPath
      const lessonUpdate: Record<string, unknown> = {
        status: schema.LESSON_STATUS.READY,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      };

      if (job.type === 'GENERATE_TTS_LESSON') {
        lessonUpdate.audioOriginalPath = `data/uploads/lessons/${lessonId}/original.wav`;
      }

      // Update lesson status to READY
      await db
        .update(schema.lessons)
        .set(lessonUpdate)
        .where(eq(schema.lessons.id, lessonId));
    }

    // If failed, update lesson status
    if (status === schema.JOB_STATUS.FAILED) {
      await db
        .update(schema.lessons)
        .set({
          status: schema.LESSON_STATUS.FAILED,
          errorMessage: errorMessage || 'Unknown error',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.lessons.id, lessonId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
