import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await db.query.jobs.findFirst({
      where: eq(schema.jobs.id, jobId),
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only return info for TRANSCRIBE_AUDIO jobs
    if (job.type !== 'TRANSCRIBE_AUDIO') {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    }

    const payload = JSON.parse(job.payloadJson);
    const audioFileId = payload.audioFileId;

    const response: {
      status: string;
      audioFileId?: string;
      text?: string;
      language?: string;
      error?: string;
    } = {
      status: job.status,
      audioFileId,
    };

    if (job.status === schema.JOB_STATUS.COMPLETED && audioFileId) {
      // Get transcription from audio_files table
      const audioFile = await db.query.audioFiles.findFirst({
        where: eq(schema.audioFiles.id, audioFileId),
      });

      if (audioFile?.transcriptionJson) {
        const transcription = JSON.parse(audioFile.transcriptionJson);
        // Combine words into full text
        response.text = transcription.words
          .map((w: { word: string }) => w.word)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        response.language = transcription.language;
      }
    }

    if (job.status === schema.JOB_STATUS.FAILED) {
      response.error = job.errorMessage || 'Unknown error';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching transcription job:', error);
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
}
