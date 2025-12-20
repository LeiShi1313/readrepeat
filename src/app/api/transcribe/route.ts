import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string | null;
    const whisperModel = (formData.get('whisperModel') as string) || 'base';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Create unique IDs
    const audioFileId = uuidv4();
    const jobId = uuidv4();

    // Create transcribe upload directory
    const uploadDir = path.join(process.cwd(), 'data', 'audio', audioFileId);
    await mkdir(uploadDir, { recursive: true });

    // Get file extension
    const originalName = audioFile.name;
    const ext = path.extname(originalName) || '.wav';
    const audioPath = path.join(uploadDir, `original${ext}`);

    // Write file to disk
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(audioPath, buffer);

    // Create audio_files record
    await db.insert(schema.audioFiles).values({
      id: audioFileId,
      filePath: audioPath,
      whisperModel,
      status: schema.AUDIO_STATUS.PENDING,
    });

    // Create transcription job
    await db.insert(schema.jobs).values({
      id: jobId,
      type: 'TRANSCRIBE_AUDIO',
      payloadJson: JSON.stringify({
        audioFileId,
        language: language || null,
        whisperModel,
      }),
      status: schema.JOB_STATUS.PENDING,
    });

    return NextResponse.json({
      jobId,
      audioFileId,
      message: 'Transcription job created',
    });
  } catch (error) {
    console.error('Error creating transcription job:', error);
    return NextResponse.json({ error: 'Failed to create transcription job' }, { status: 500 });
  }
}
