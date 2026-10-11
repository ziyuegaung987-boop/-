import Script from "next/script";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import { getCampaign } from "../db/campaign";
import { getDailyHistory } from "../db/daily";
import { gameMarkup } from "./game-markup";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  let campaign = { levels: [] as { id: number; score: number; stars: number }[], nextLevel: 1, completedCount: 0, totalStars: 0 };
  let storageUnavailable = false;
  let dailyRecords: { day: string; levelId: number; score: number }[] = [];
  if (user) {
    try { [campaign, dailyRecords] = await Promise.all([getCampaign(user.userId), getDailyHistory(user.userId)]); }
    catch { storageUnavailable = true; }
  }
  const progressLabel = campaign.completedCount === 30
    ? `30 关已通关 · ${campaign.totalStars} 星`
    : `已过 ${campaign.completedCount} / 30 关 · ${campaign.totalStars} 星`;

  return <>
    <div id="account-context" className="account-strip" data-signed-in={user ? "true" : "false"}
      data-user-key={user?.userId || "guest"}
      data-records={JSON.stringify(campaign.levels)} data-next-level={campaign.nextLevel}
      data-daily-records={JSON.stringify(dailyRecords)}
      data-storage-ready={storageUnavailable ? "false" : "true"}>
      {user ? <>
        <span className="account-identity"><span className="account-avatar" aria-hidden="true">✦</span><span className="account-name" title={user.displayName}>{user.displayName}</span></span>
        <span className="account-progress">{storageUnavailable ? "进度暂时无法读取" : progressLabel}</span>
        <a href={chatGPTSignOutPath("/")} target="_top" className="account-link">退出登录</a>
      </> : <>
        <span className="guest-note">游客可试玩 · 登录后跨设备同步 30 关记录</span>
        <a href={chatGPTSignInPath("/")} target="_top" className="account-login">用 ChatGPT 登录</a>
      </>}
    </div>
    <div dangerouslySetInnerHTML={{ __html: gameMarkup }} />
    <Script src="/game.js" type="module" strategy="afterInteractive" />
  </>;
}
