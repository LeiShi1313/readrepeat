CREATE TABLE `user_recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`sentence_id` text NOT NULL,
	`audio_path` text NOT NULL,
	`duration_ms` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`id`) ON UPDATE no action ON DELETE cascade
);
