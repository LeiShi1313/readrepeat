import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET: Fetch audio file info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const audioFile = await db.query.audioFiles.findFirst({
      where: eq(schema.audioFiles.id, id),
    });

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    return NextResponse.json(audioFile);
  } catch (error) {
    console.error('Error fetching audio file:', error);
    return NextResponse.json({ error: 'Failed to fetch audio file' }, { status: 500 });
  }
}

// PATCH: Update audio file (transcription, status, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      transcription,
      durationMs,
      language,
      status,
      errorMessage,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (transcription !== undefined) {
      updateData.transcriptionJson = JSON.stringify(transcription);
      // Also set status to COMPLETED when transcription is provided
      updateData.status = schema.AUDIO_STATUS.COMPLETED;
    }
    if (durationMs !== undefined) {
      updateData.durationMs = durationMs;
    }
    if (language !== undefined) {
      updateData.language = language;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
      // Also set status to FAILED when error is provided
      if (!status) {
        updateData.status = schema.AUDIO_STATUS.FAILED;
      }
    }

    await db
      .update(schema.audioFiles)
      .set(updateData)
      .where(eq(schema.audioFiles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating audio file:', error);
    return NextResponse.json({ error: 'Failed to update audio file' }, { status: 500 });
  }
}
