CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`foreign_text_raw` text NOT NULL,
	`translation_text_raw` text NOT NULL,
	`foreign_lang` text DEFAULT 'en' NOT NULL,
	`translation_lang` text DEFAULT 'zh' NOT NULL,
	`status` text DEFAULT 'UPLOADED' NOT NULL,
	`error_message` text,
	`audio_original_path` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sentences` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`idx` integer NOT NULL,
	`foreign_text` text NOT NULL,
	`translation_text` text NOT NULL,
	`start_ms` integer,
	`end_ms` integer,
	`clip_path` text,
	`confidence` real,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
