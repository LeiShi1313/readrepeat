import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { statSync, createReadStream } from 'fs';
import { lookup } from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sentenceId: string }> }
) {
  try {
    const { sentenceId } = await params;

    const recording = await db.query.userRecordings.findFirst({
      where: eq(schema.userRecordings.sentenceId, sentenceId),
    });

    if (!recording || !recording.audioPath) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const filePath = recording.audioPath;

    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      return NextResponse.json({ error: 'Recording file not found' }, { status: 404 });
    }

    const fileSize = stat.size;
    const mimeType = lookup(filePath) || 'audio/webm';

    // Stream the file
    const stream = createReadStream(filePath);
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving recording:', error);
    return NextResponse.json({ error: 'Failed to serve recording' }, { status: 500 });
  }
}
