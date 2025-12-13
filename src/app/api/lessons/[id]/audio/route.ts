import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;

    // Verify lesson exists
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Create lesson upload directory
    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'lessons', lessonId);
    await mkdir(uploadDir, { recursive: true });

    // Get file extension
    const originalName = audioFile.name;
    const ext = path.extname(originalName) || '.wav';
    const audioPath = path.join(uploadDir, `original${ext}`);

    // Write file to disk
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(audioPath, buffer);

    // Delete existing sentences (for re-upload case)
    await db.delete(schema.sentences).where(eq(schema.sentences.lessonId, lessonId));

    // Update lesson with audio path and create processing job
    await db
      .update(schema.lessons)
      .set({
        audioOriginalPath: audioPath,
        status: schema.LESSON_STATUS.PROCESSING,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.lessons.id, lessonId));

    // Create processing job
    const jobId = uuidv4();
    await db.insert(schema.jobs).values({
      id: jobId,
      type: 'PROCESS_LESSON',
      payloadJson: JSON.stringify({ lessonId }),
      status: schema.JOB_STATUS.PENDING,
    });

    return NextResponse.json({
      message: 'Audio uploaded, processing started',
      jobId,
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
  }
}
