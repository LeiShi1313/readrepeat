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

    const sentence = await db.query.sentences.findFirst({
      where: eq(schema.sentences.id, sentenceId),
    });

    if (!sentence || !sentence.clipPath) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const filePath = sentence.clipPath;

    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      return NextResponse.json({ error: 'Clip file not found' }, { status: 404 });
    }

    const fileSize = stat.size;
    const mimeType = lookup(filePath) || 'audio/wav';

    // Full file response (clips are small, no need for range requests)
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
        'Cache-Control': 'public, max-age=31536000', // Cache clips aggressively
      },
    });
  } catch (error) {
    console.error('Error serving clip:', error);
    return NextResponse.json({ error: 'Failed to serve clip' }, { status: 500 });
  }
}
