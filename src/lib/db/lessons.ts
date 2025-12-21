import { db, schema } from '@/lib/db';
import { desc, eq, or, like, sql } from 'drizzle-orm';
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

/**
 * Search lessons by title, foreign text, translation text, or tags.
 * Case-insensitive search using SQL LIKE.
 */
export async function searchLessonsWithTags(query: string): Promise<LessonWithTags[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return getAllLessonsWithTags();
  }

  const pattern = `%${normalizedQuery}%`;

  // First, find lesson IDs that match the search criteria
  // We need to search in lessons table AND in tags
  const lessonIdsFromText = await db
    .selectDistinct({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(
      or(
        like(sql`lower(${schema.lessons.title})`, pattern),
        like(sql`lower(${schema.lessons.foreignTextRaw})`, pattern),
        like(sql`lower(${schema.lessons.translationTextRaw})`, pattern)
      )
    );

  const lessonIdsFromTags = await db
    .selectDistinct({ id: schema.lessonTags.lessonId })
    .from(schema.lessonTags)
    .innerJoin(schema.tags, eq(schema.lessonTags.tagId, schema.tags.id))
    .where(like(schema.tags.name, pattern));

  // Combine unique lesson IDs
  const allIds = new Set([
    ...lessonIdsFromText.map((r) => r.id),
    ...lessonIdsFromTags.map((r) => r.id),
  ]);

  if (allIds.size === 0) {
    return [];
  }

  // Fetch full lesson data with tags for matching IDs
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

  // Group tags by lesson, filtering to only matching IDs
  const lessonsMap = new Map<string, LessonWithTags>();
  for (const row of rows) {
    if (!allIds.has(row.lesson.id)) continue;

    if (!lessonsMap.has(row.lesson.id)) {
      lessonsMap.set(row.lesson.id, { ...row.lesson, tags: [] });
    }
    if (row.tag && row.tag.id) {
      lessonsMap.get(row.lesson.id)!.tags.push(row.tag);
    }
  }

  return Array.from(lessonsMap.values());
}
