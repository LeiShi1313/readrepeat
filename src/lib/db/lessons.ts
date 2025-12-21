import { db, schema } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';
import type { TagInfo } from '@/lib/utils';

export interface LessonWithTags {
  id: string;
  title: string;
  foreignTextRaw: string;
  translationTextRaw: string;
  foreignLang: string;
  translationLang: string;
  whisperModel: string;
  isDialog: number;
  status: string;
  errorMessage: string | null;
  audioOriginalPath: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagInfo[];
}

/**
 * Get all lessons with their tags in a single query.
 */
export async function getAllLessonsWithTags(): Promise<LessonWithTags[]> {
  const rows = await db
    .select({
      lesson: schema.lessons,
      tag: {
        id: schema.tags.id,
        name: schema.tags.name,
        displayName: schema.tags.displayName,
      },
    })
    .from(schema.lessons)
    .leftJoin(schema.lessonTags, eq(schema.lessons.id, schema.lessonTags.lessonId))
    .leftJoin(schema.tags, eq(schema.lessonTags.tagId, schema.tags.id))
    .orderBy(desc(schema.lessons.createdAt));

  // Group tags by lesson
  const lessonsMap = new Map<string, LessonWithTags>();
  for (const row of rows) {
    if (!lessonsMap.has(row.lesson.id)) {
      lessonsMap.set(row.lesson.id, { ...row.lesson, tags: [] });
    }
    if (row.tag && row.tag.id) {
      lessonsMap.get(row.lesson.id)!.tags.push(row.tag);
    }
  }

  return Array.from(lessonsMap.values());
}

/**
 * Get a single lesson by ID with its tags.
 */
export async function getLessonWithTags(id: string): Promise<LessonWithTags | null> {
  const rows = await db
    .select({
      lesson: schema.lessons,
      tag: {
        id: schema.tags.id,
        name: schema.tags.name,
        displayName: schema.tags.displayName,
      },
    })
    .from(schema.lessons)
    .leftJoin(schema.lessonTags, eq(schema.lessons.id, schema.lessonTags.lessonId))
    .leftJoin(schema.tags, eq(schema.lessonTags.tagId, schema.tags.id))
    .where(eq(schema.lessons.id, id));

  if (rows.length === 0) {
    return null;
  }

  const lesson: LessonWithTags = { ...rows[0].lesson, tags: [] };
  for (const row of rows) {
    if (row.tag && row.tag.id) {
      lesson.tags.push(row.tag);
    }
  }

  return lesson;
}
