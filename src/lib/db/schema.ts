import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Lesson status enum values
export const LESSON_STATUS = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;

export type LessonStatus = (typeof LESSON_STATUS)[keyof typeof LESSON_STATUS];

// Job status enum values
export const JOB_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// Whisper model options
export const WHISPER_MODELS = {
  TINY: 'tiny',
  BASE: 'base',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE_V3: 'large-v3',
} as const;

export type WhisperModel = (typeof WHISPER_MODELS)[keyof typeof WHISPER_MODELS];

// Lessons table
export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  foreignTextRaw: text('foreign_text_raw').notNull(),
  translationTextRaw: text('translation_text_raw').notNull(),
  foreignLang: text('foreign_lang').notNull().default('en'),
  translationLang: text('translation_lang').notNull().default('zh'),
  whisperModel: text('whisper_model').notNull().default(WHISPER_MODELS.BASE),
  isDialog: integer('is_dialog').notNull().default(0),
  status: text('status').notNull().default(LESSON_STATUS.UPLOADED),
  errorMessage: text('error_message'),
  audioOriginalPath: text('audio_original_path'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Sentences table
export const sentences = sqliteTable('sentences', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  idx: integer('idx').notNull(),
  foreignText: text('foreign_text').notNull(),
  translationText: text('translation_text').notNull(),
  startMs: integer('start_ms'),
  endMs: integer('end_ms'),
  clipPath: text('clip_path'),
  confidence: real('confidence'),
});

// Jobs table (SQLite-backed job queue)
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payloadJson: text('payload_json').notNull(),
  status: text('status').notNull().default(JOB_STATUS.PENDING),
  resultJson: text('result_json'),
  errorMessage: text('error_message'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Audio files table (stores audio metadata and transcription results)
export const AUDIO_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type AudioStatus = (typeof AUDIO_STATUS)[keyof typeof AUDIO_STATUS];

export const audioFiles = sqliteTable('audio_files', {
  id: text('id').primaryKey(),
  filePath: text('file_path').notNull(),
  durationMs: integer('duration_ms'),
  whisperModel: text('whisper_model'),
  language: text('language'),
  // Stores word-level transcription: [{word, start, end, probability}, ...]
  transcriptionJson: text('transcription_json'),
  status: text('status').notNull().default(AUDIO_STATUS.PENDING),
  errorMessage: text('error_message'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// User recordings table (for voice comparison feature)
export const userRecordings = sqliteTable('user_recordings', {
  id: text('id').primaryKey(),
  sentenceId: text('sentence_id')
    .notNull()
    .references(() => sentences.id, { onDelete: 'cascade' }),
  audioPath: text('audio_path').notNull(),
  durationMs: integer('duration_ms'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// TypeScript types inferred from schema
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Sentence = typeof sentences.$inferSelect;
export type NewSentence = typeof sentences.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type AudioFile = typeof audioFiles.$inferSelect;
export type NewAudioFile = typeof audioFiles.$inferInsert;
export type UserRecording = typeof userRecordings.$inferSelect;
export type NewUserRecording = typeof userRecordings.$inferInsert;
