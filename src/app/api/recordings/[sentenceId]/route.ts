import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

// GET - Check if recording exists for sentence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sentenceId: string }> }
) {
  try {
    const { sentenceId } = await params;

    const recording = await db.query.userRecordings.findFirst({
      where: eq(schema.userRecordings.sentenceId, sentenceId),
    });

    if (!recording) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      id: recording.id,
      durationMs: recording.durationMs,
      createdAt: recording.createdAt,
    });
  } catch (error) {
    console.error('Error checking recording:', error);
    return NextResponse.json({ error: 'Failed to check recording' }, { status: 500 });
  }
}

// POST - Upload user recording
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sentenceId: string }> }
) {
  try {
    const { sentenceId } = await params;

    // Verify sentence exists and get lessonId
    const sentence = await db.query.sentences.findFirst({
      where: eq(schema.sentences.id, sentenceId),
    });

    if (!sentence) {
      return NextResponse.json({ error: 'Sentence not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const durationMs = formData.get('durationMs') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Delete existing recording if any
    const existingRecording = await db.query.userRecordings.findFirst({
      where: eq(schema.userRecordings.sentenceId, sentenceId),
    });

    if (existingRecording) {
      // Delete old file
      try {
        await unlink(existingRecording.audioPath);
      } catch {
        // File may not exist, ignore
      }
      await db.delete(schema.userRecordings).where(eq(schema.userRecordings.id, existingRecording.id));
    }

    // Create recordings directory
    const uploadDir = path.join(
      process.cwd(),
      'data',
      'uploads',
      'lessons',
      sentence.lessonId,
      'recordings'
    );
    await mkdir(uploadDir, { recursive: true });

    // Generate recording ID and file path
    const recordingId = uuidv4();
    const ext = audioFile.name.endsWith('.webm') ? '.webm' : '.webm';
    const audioPath = path.join(uploadDir, `${sentenceId}_${recordingId}${ext}`);

    // Write file to disk
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(audioPath, buffer);

    // Insert recording record
    await db.insert(schema.userRecordings).values({
      id: recordingId,
      sentenceId,
      audioPath,
      durationMs: durationMs ? parseInt(durationMs, 10) : null,
    });

    return NextResponse.json({
      id: recordingId,
      message: 'Recording saved',
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading recording:', error);
    return NextResponse.json({ error: 'Failed to upload recording' }, { status: 500 });
  }
}

// DELETE - Remove recording
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sentenceId: string }> }
) {
  try {
    const { sentenceId } = await params;

    const recording = await db.query.userRecordings.findFirst({
      where: eq(schema.userRecordings.sentenceId, sentenceId),
    });

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Delete file
    try {
      await unlink(recording.audioPath);
    } catch {
      // File may not exist, continue anyway
    }

    // Delete database record
    await db.delete(schema.userRecordings).where(eq(schema.userRecordings.id, recording.id));

    return NextResponse.json({ message: 'Recording deleted' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
  }
}
