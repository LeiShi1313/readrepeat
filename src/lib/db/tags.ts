import { db, schema } from '@/lib/db';
import { eq, inArray, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { TagInfo } from '@/lib/utils';

export type { TagInfo };

/**
 * Create or find tags and link them to a lesson.
 * Tags are case-insensitive: "Grammar" and "grammar" are treated as the same tag.
 */
export async function createLessonTags(
  lessonId: string,
  tagNames: string[]
): Promise<void> {
  for (const tagName of tagNames) {
    const trimmed = tagName.trim();
    if (!trimmed) continue;

    const normalizedName = trimmed.toLowerCase();

    // Find or create tag
    let tag = await db.query.tags.findFirst({
      where: eq(schema.tags.name, normalizedName),
    });

    if (!tag) {
      const tagId = uuidv4();
      await db.insert(schema.tags).values({
        id: tagId,
        name: normalizedName,
        displayName: trimmed, // Preserve original case
      });
      tag = { id: tagId, name: normalizedName, displayName: trimmed, createdAt: '' };
    }

    // Check if relationship already exists
    const existing = await db.query.lessonTags.findFirst({
      where: (lt, { and }) =>
        and(eq(lt.lessonId, lessonId), eq(lt.tagId, tag!.id)),
    });

    if (!existing) {
      await db.insert(schema.lessonTags).values({
        id: uuidv4(),
        lessonId,
        tagId: tag.id,
      });
    }
  }
}

/**
 * Get all tags for a lesson.
 */
export async function getLessonTags(lessonId: string): Promise<TagInfo[]> {
  const result = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      displayName: schema.tags.displayName,
    })
    .from(schema.lessonTags)
    .innerJoin(schema.tags, eq(schema.lessonTags.tagId, schema.tags.id))
    .where(eq(schema.lessonTags.lessonId, lessonId));

  return result;
}

/**
 * Get tags for multiple lessons in a single query (batch fetch to avoid N+1).
 */
export async function getTagsForLessons(
  lessonIds: string[]
): Promise<Record<string, TagInfo[]>> {
  if (lessonIds.length === 0) return {};

  const result = await db
    .select({
      lessonId: schema.lessonTags.lessonId,
      id: schema.tags.id,
      name: schema.tags.name,
      displayName: schema.tags.displayName,
    })
    .from(schema.lessonTags)
    .innerJoin(schema.tags, eq(schema.lessonTags.tagId, schema.tags.id))
    .where(inArray(schema.lessonTags.lessonId, lessonIds));

  // Group by lessonId
  const tagsByLesson: Record<string, TagInfo[]> = {};
  for (const row of result) {
    if (!tagsByLesson[row.lessonId]) {
      tagsByLesson[row.lessonId] = [];
    }
    tagsByLesson[row.lessonId].push({
      id: row.id,
      name: row.name,
      displayName: row.displayName,
    });
  }

  return tagsByLesson;
}

/**
 * Delete all tags for a lesson (used before updating tags).
 */
export async function deleteLessonTags(lessonId: string): Promise<void> {
  await db
    .delete(schema.lessonTags)
    .where(eq(schema.lessonTags.lessonId, lessonId));
}

/**
 * Update tags for a lesson (replace strategy: delete all, then create new).
 */
export async function updateLessonTags(
  lessonId: string,
  tagNames: string[]
): Promise<void> {
  await deleteLessonTags(lessonId);
  await createLessonTags(lessonId, tagNames);
}

/**
 * Search tags by name prefix for autocomplete.
 */
export async function searchTags(query: string, limit = 20): Promise<TagInfo[]> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    // Return all tags if no query
    const tags = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        displayName: schema.tags.displayName,
      })
      .from(schema.tags)
      .limit(limit);
    return tags;
  }

  const tags = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      displayName: schema.tags.displayName,
    })
    .from(schema.tags)
    .where(like(schema.tags.name, `%${normalizedQuery}%`))
    .limit(limit);

  return tags;
}
