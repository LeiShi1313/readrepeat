import { NextRequest, NextResponse } from 'next/server';
import { searchLessonsWithTags } from '@/lib/db/lessons';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  try {
    const lessons = await searchLessonsWithTags(query);
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search lessons' },
      { status: 500 }
    );
  }
}
