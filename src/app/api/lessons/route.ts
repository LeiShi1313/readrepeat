import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, foreignText, translationText, foreignLang, translationLang, whisperModel } = body;

    // Validate required fields
    if (!foreignText || !translationText) {
      return NextResponse.json(
        { error: 'Missing required fields: foreignText, translationText' },
        { status: 400 }
      );
    }

    const lessonId = uuidv4();
    const lessonTitle = title || foreignText.slice(0, 50) + (foreignText.length > 50 ? '...' : '');

    await db.insert(schema.lessons).values({
      id: lessonId,
      title: lessonTitle,
      foreignTextRaw: foreignText,
      translationTextRaw: translationText,
      foreignLang: foreignLang || 'en',
      translationLang: translationLang || 'zh',
      whisperModel: whisperModel || schema.WHISPER_MODELS.BASE,
      status: schema.LESSON_STATUS.UPLOADED,
    });

    return NextResponse.json({ id: lessonId }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allLessons = await db
      .select()
      .from(schema.lessons)
      .orderBy(desc(schema.lessons.createdAt));
    return NextResponse.json(allLessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}
