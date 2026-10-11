CREATE TABLE `game_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`completed_course` integer DEFAULT 0 NOT NULL,
	`current_course` integer DEFAULT 1 NOT NULL,
	`checkpoint` integer DEFAULT 0 NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
