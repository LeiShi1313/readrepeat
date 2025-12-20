CREATE TABLE `audio_files` (
	`id` text PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`duration_ms` integer,
	`whisper_model` text,
	`language` text,
	`transcription_json` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
