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
    const body = await request.json();
    const {
      voiceName = 'Zephyr',
      model = 'gemini-2.5-flash-preview-tts',
      speakerMode = 'article',
      voice2Name = 'Kore',
    } = body;

    // Check if GEMINI_API_KEY is configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'TTS service not configured' },
        { status: 503 }
      );
    }

    // Get the lesson
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check lesson status - should be UPLOADED (text entered, no audio yet)
    if (lesson.status !== schema.LESSON_STATUS.UPLOADED) {
      return NextResponse.json(
        { error: 'Lesson already has audio or is being processed' },
        { status: 400 }
      );
    }

    // Create TTS job
    const jobId = uuidv4();
    await db.insert(schema.jobs).values({
      id: jobId,
      type: 'GENERATE_TTS_LESSON',
      payloadJson: JSON.stringify({
        lessonId,
        voiceName,
        ttsModel: model,
        speakerMode,
        voice2Name,
      }),
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

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error('Error creating TTS job:', error);
    return NextResponse.json(
      { error: 'Failed to create TTS job' },
      { status: 500 }
    );
  }
}
