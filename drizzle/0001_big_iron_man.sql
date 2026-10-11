CREATE TABLE `level_progress` (
	`user_id` text NOT NULL,
	`level_id` integer NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`best_stars` integer DEFAULT 0 NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `level_id`)
);
--> statement-breakpoint
-- Carry forward the old three-course saves as completed stretches of the new map.
WITH RECURSIVE chapter_steps(level_id) AS (
  SELECT 1 UNION ALL SELECT level_id + 1 FROM chapter_steps WHERE level_id < 30
)
INSERT INTO level_progress (user_id, level_id, best_score, best_stars, completed_at)
SELECT p.user_id, chapter_steps.level_id, 0, 1, CURRENT_TIMESTAMP
FROM game_progress AS p JOIN chapter_steps
  ON chapter_steps.level_id <= MIN(30, p.completed_course * 10 +
    CASE WHEN p.current_course > p.completed_course THEN p.checkpoint * 2 ELSE 0 END)
ON CONFLICT(user_id, level_id) DO NOTHING;
