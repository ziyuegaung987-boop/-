import { getChatGPTUser } from "../../chatgpt-auth";
import { getDailyHistory, saveDailyFlight } from "../../../db/daily";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录再查看每日邮路" }, { status: 401 });
  try { return Response.json({ days: await getDailyHistory(user.userId) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "每日邮路暂时无法读取" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录再保存每日邮路" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "记录格式不正确" }, { status: 400 });
  const { day, levelId, score } = body as Record<string, unknown>;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today || day < "2026-01-01"
    || !Number.isInteger(levelId) || (levelId as number) < 1 || (levelId as number) > 30
    || !Number.isInteger(score) || (score as number) < 0 || (score as number) > 100000) {
    return Response.json({ error: "记录格式不正确" }, { status: 400 });
  }
  try { return Response.json({ days: await saveDailyFlight(user.userId, day, levelId as number, score as number) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "每日邮路暂时没能保存，请重试" }, { status: 503 }); }
}
