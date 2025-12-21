CREATE TABLE `lesson_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `lesson_tags_lesson_id_idx` ON `lesson_tags` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_tags_tag_id_idx` ON `lesson_tags` (`tag_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`foreign_text_raw` text NOT NULL,
	`translation_text_raw` text NOT NULL,
	`foreign_lang` text DEFAULT 'en' NOT NULL,
	`translation_lang` text DEFAULT 'zh' NOT NULL,
	`whisper_model` text DEFAULT 'base' NOT NULL,
	`is_dialog` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'UPLOADED' NOT NULL,
	`error_message` text,
	`audio_original_path` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_lessons`("id", "title", "foreign_text_raw", "translation_text_raw", "foreign_lang", "translation_lang", "whisper_model", "is_dialog", "status", "error_message", "audio_original_path", "created_at", "updated_at") SELECT "id", "title", "foreign_text_raw", "translation_text_raw", "foreign_lang", "translation_lang", "whisper_model", "is_dialog", "status", "error_message", "audio_original_path", "created_at", "updated_at" FROM `lessons`;--> statement-breakpoint
DROP TABLE `lessons`;--> statement-breakpoint
ALTER TABLE `__new_lessons` RENAME TO `lessons`;--> statement-breakpoint
PRAGMA foreign_keys=ON;