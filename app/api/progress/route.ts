import { getChatGPTUser } from "../../chatgpt-auth";
import { getProgress, saveProgress } from "../../../db/progress";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录再查看进度" }, { status: 401 });
  try { return Response.json(await getProgress(user.userId), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "读取进度暂时失败，请稍后再试" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录再保存进度" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "进度格式不正确" }, { status: 400 });
  const { course, checkpoint, score } = body as Record<string, unknown>;
  if (!Number.isInteger(course) || !Number.isInteger(checkpoint) || !Number.isInteger(score)
    || (course as number) < 1 || (course as number) > 3
    || (checkpoint as number) < 1 || (checkpoint as number) > 5
    || (score as number) < 0 || (score as number) > 100000) {
    return Response.json({ error: "进度格式不正确" }, { status: 400 });
  }
  try { return Response.json(await saveProgress(user.userId, course as number, checkpoint as number, score as number), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (error instanceof Error && error.message === "COURSE_LOCKED")
      return Response.json({ error: "请先完成上一程" }, { status: 409 });
    return Response.json({ error: "暂时没能保存，请点重试" }, { status: 503 });
  }
}
