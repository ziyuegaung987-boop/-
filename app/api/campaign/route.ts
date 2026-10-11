import { getChatGPTUser } from "../../chatgpt-auth";
import { getCampaign, saveLevel } from "../../../db/campaign";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录再查看关卡记录" }, { status: 401 });
  try { return Response.json(await getCampaign(user.userId), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "读取关卡记录暂时失败" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录再保存关卡" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "关卡记录格式不正确" }, { status: 400 });
  const { levelId, score, stars } = body as Record<string, unknown>;
  if (!Number.isInteger(levelId) || !Number.isInteger(score) || !Number.isInteger(stars)
    || (levelId as number) < 1 || (levelId as number) > 30
    || (score as number) < 0 || (score as number) > 100000
    || (stars as number) < 1 || (stars as number) > 3) {
    return Response.json({ error: "关卡记录格式不正确" }, { status: 400 });
  }
  try { return Response.json(await saveLevel(user.userId, levelId as number, score as number, stars as number), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (error instanceof Error && error.message === "LEVEL_LOCKED")
      return Response.json({ error: "请先完成前面的关卡" }, { status: 409 });
    return Response.json({ error: "暂时没能保存关卡，请重试" }, { status: 503 });
  }
}
