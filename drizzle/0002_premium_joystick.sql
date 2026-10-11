CREATE TABLE `daily_flights` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`level_id` integer NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
