import { env } from "cloudflare:workers";

export type DailyRecord = { day: string; levelId: number; score: number };

function database() {
  if (!env.DB) throw new Error("Progress database is unavailable");
  return env.DB;
}

export async function getDailyHistory(userId: string): Promise<DailyRecord[]> {
  const rows = await database().prepare(
    "SELECT day, level_id, best_score FROM daily_flights WHERE user_id = ? ORDER BY day DESC LIMIT 400"
  ).bind(userId).all<{ day: string; level_id: number; best_score: number }>();
  return rows.results.map(row => ({ day: row.day, levelId: row.level_id, score: row.best_score }));
}

export async function saveDailyFlight(userId: string, day: string, levelId: number, score: number) {
  await database().prepare(`
    INSERT INTO daily_flights (user_id, day, level_id, best_score, completed_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, day) DO UPDATE SET
      best_score = MAX(daily_flights.best_score, excluded.best_score),
      level_id = CASE WHEN excluded.best_score > daily_flights.best_score THEN excluded.level_id ELSE daily_flights.level_id END
  `).bind(userId, day, levelId, score).run();
  return getDailyHistory(userId);
}
