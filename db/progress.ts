import { env } from "cloudflare:workers";

export type Progress = { completedCourse: number; currentCourse: number; checkpoint: number; bestScore: number };
const empty: Progress = { completedCourse: 0, currentCourse: 1, checkpoint: 0, bestScore: 0 };

function database() {
  if (!env.DB) throw new Error("Progress database is unavailable");
  return env.DB;
}

export async function getProgress(userId: string): Promise<Progress> {
  const row = await database()
    .prepare("SELECT completed_course, current_course, checkpoint, best_score FROM game_progress WHERE user_id = ?")
    .bind(userId)
    .first<{ completed_course: number; current_course: number; checkpoint: number; best_score: number }>();
  return row ? {
    completedCourse: row.completed_course, currentCourse: row.current_course,
    checkpoint: row.checkpoint, bestScore: row.best_score,
  } : { ...empty };
}

export async function saveProgress(userId: string, course: number, checkpoint: number, score: number): Promise<Progress> {
  const current = await getProgress(userId);
  if (course > current.completedCourse + 1) throw new Error("COURSE_LOCKED");
  const completed = checkpoint === 5 ? Math.max(current.completedCourse, course) : current.completedCourse;
  const nextCourse = checkpoint === 5 ? Math.min(3, course + 1) : course;
  const nextCheckpoint = checkpoint === 5 ? 0 : checkpoint;
  await database().prepare(`
    INSERT INTO game_progress (user_id, completed_course, current_course, checkpoint, best_score, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      completed_course = MAX(game_progress.completed_course, excluded.completed_course),
      current_course = MAX(game_progress.current_course, excluded.current_course),
      checkpoint = CASE
        WHEN MAX(game_progress.completed_course, excluded.completed_course) >= 3 THEN 0
        WHEN excluded.current_course > game_progress.current_course THEN excluded.checkpoint
        WHEN excluded.current_course = game_progress.current_course THEN MAX(game_progress.checkpoint, excluded.checkpoint)
        ELSE game_progress.checkpoint END,
      best_score = MAX(game_progress.best_score, excluded.best_score),
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, completed, nextCourse, nextCheckpoint, score).run();
  return getProgress(userId);
}
