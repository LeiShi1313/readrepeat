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

    return NextResponse.json({
      job: {
        ...job,
        lesson,
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
    const { jobId, status, errorMessage, sentences } = body;

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

    // If completed with sentences, insert them
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

      // Update lesson status to READY
      await db
        .update(schema.lessons)
        .set({
          status: schema.LESSON_STATUS.READY,
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        })
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
