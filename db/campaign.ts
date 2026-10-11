import { env } from "cloudflare:workers";

export type LevelRecord = { id: number; score: number; stars: number };
export type Campaign = { levels: LevelRecord[]; nextLevel: number; completedCount: number; totalStars: number };

function database() {
  if (!env.DB) throw new Error("Progress database is unavailable");
  return env.DB;
}

export async function getCampaign(userId: string): Promise<Campaign> {
  const rows = await database().prepare(
    "SELECT level_id, best_score, best_stars FROM level_progress WHERE user_id = ? ORDER BY level_id"
  ).bind(userId).all<{ level_id: number; best_score: number; best_stars: number }>();
  const levels = rows.results.map(row => ({ id: row.level_id, score: row.best_score, stars: row.best_stars }));
  const completed = new Set(levels.map(level => level.id));
  let nextLevel = 1;
  while (nextLevel <= 30 && completed.has(nextLevel)) nextLevel++;
  return { levels, nextLevel, completedCount: levels.length, totalStars: levels.reduce((sum, level) => sum + level.stars, 0) };
}

export async function saveLevel(userId: string, levelId: number, score: number, stars: number): Promise<Campaign> {
  const current = await getCampaign(userId);
  if (levelId > current.nextLevel) throw new Error("LEVEL_LOCKED");
  await database().prepare(`
    INSERT INTO level_progress (user_id, level_id, best_score, best_stars, completed_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, level_id) DO UPDATE SET
      best_score = MAX(level_progress.best_score, excluded.best_score),
      best_stars = MAX(level_progress.best_stars, excluded.best_stars)
  `).bind(userId, levelId, score, stars).run();
  return getCampaign(userId);
}
