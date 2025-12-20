import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and, or } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;

    // Get the lesson
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Only allow canceling PROCESSING lessons
    if (lesson.status !== schema.LESSON_STATUS.PROCESSING) {
      return NextResponse.json(
        { error: 'Lesson is not processing' },
        { status: 400 }
      );
    }

    // Find and cancel any pending/processing jobs for this lesson
    const jobs = await db
      .select()
      .from(schema.jobs)
      .where(
        or(
          eq(schema.jobs.status, schema.JOB_STATUS.PENDING),
          eq(schema.jobs.status, schema.JOB_STATUS.PROCESSING)
        )
      );

    for (const job of jobs) {
      try {
        const payload = JSON.parse(job.payloadJson);
        if (payload.lessonId === lessonId) {
          await db
            .update(schema.jobs)
            .set({
              status: schema.JOB_STATUS.FAILED,
              errorMessage: 'Cancelled by user',
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.jobs.id, job.id));
        }
      } catch {
        // Skip jobs with invalid JSON
      }
    }

    // Determine the new status based on whether audio exists
    let newStatus: string;
    if (lesson.audioOriginalPath) {
      // Has audio but processing failed - mark as FAILED so user sees error state
      newStatus = schema.LESSON_STATUS.FAILED;
    } else {
      // Was generating TTS - reset to UPLOADED so user can retry
      newStatus = schema.LESSON_STATUS.UPLOADED;
    }

    // Update lesson status
    await db
      .update(schema.lessons)
      .set({
        status: newStatus,
        errorMessage: lesson.audioOriginalPath ? 'Processing cancelled by user' : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.lessons.id, lessonId));

    return NextResponse.json({
      message: 'Processing cancelled',
      newStatus,
    });
  } catch (error) {
    console.error('Error cancelling processing:', error);
    return NextResponse.json(
      { error: 'Failed to cancel processing' },
      { status: 500 }
    );
  }
}
