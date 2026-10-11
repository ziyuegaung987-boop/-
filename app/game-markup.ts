export const gameMarkup = String.raw`
<main class="app">
    <header class="masthead">
      <div class="brand"><span class="brand-mark" aria-hidden="true"><img src="/pigeon-storybook.webp" alt="" width="57" height="44"></span><div><h1>飞鸽传信<span class="brand-divider">/</span><span class="brand-sub">云间来信</span></h1><p>从江南到山海与星河的三段飞行旅程</p></div></div>
      <div class="header-actions"><button class="phone-button" id="phone-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></svg>手机打开</button><button class="help-button" id="help-button" type="button" aria-label="查看按键和教学">按键说明</button><button class="sound-button" id="sound-button" type="button" aria-label="关闭游戏声音" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path id="sound-lines" d="M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/></svg><span id="sound-label">声音开启</span></button></div>
    </header>

    <section class="journey-header" aria-label="飞行任务">
      <div class="route-label"><span class="route-tag">今日旅程</span><span id="route-origin">江南寄信</span><span class="route-dots" aria-hidden="true">···</span><span id="route-destination">云间</span></div>
      <span class="journey-duration" id="journey-duration">信鸽 · 收下来信，送达五站</span>
    </section>

    <section class="playfield overlay-open" id="playfield" aria-label="飞鸽传信游戏">
      <canvas id="game-canvas" tabindex="0" aria-label="飞行画面。点击或按空格拍动翅膀，避开风筝。按 P 暂停，按 R 重新开始。"></canvas>

      <div class="hud">
        <div class="hud-left"><div class="hearts" id="hearts" aria-label="剩余三次飞行机会"><span>♥</span><span>♥</span><span>♥</span></div><span class="hud-divider"></span><div class="mail-count" id="mail-progress" aria-label="已收集 0 封来信，目标 1 封"><span id="collect-icon" aria-hidden="true">✉</span><span id="mail-count">0 / 1</span><span class="hud-caption" id="collect-caption">来信</span></div></div>
        <div class="hud-right"><span id="distance">0</span><span class="hud-caption" id="distance-total">/ 370 米</span><button class="pause-button" id="pause-button" type="button" aria-label="暂停飞行" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12"/></svg></button></div>
      </div>
      <div class="flight-track" aria-hidden="true"><span id="flight-track-fill"></span></div>
      <div class="mission-status" id="mission-status" role="status" aria-live="polite" hidden></div>

      <div class="ability-hud"><span id="combo-badge" class="combo-badge" hidden>2 连收</span><span id="shield-badge" class="shield-badge" hidden>羽毛护盾</span><span id="updraft-badge" class="updraft-badge" hidden>乘风上升</span><span id="boost-badge" class="boost-badge" hidden>顺风冲刺</span></div>
      <div class="tutorial-card" id="tutorial" hidden role="region" aria-labelledby="tutorial-title">
        <div class="tutorial-head"><span id="tutorial-progress">1 / 3 · 试飞教学</span><button id="tutorial-skip" type="button">跳过</button></div>
        <h2 id="tutorial-title">先试着飞一下</h2>
        <p id="tutorial-description">按一下空格键，或轻点画面，让信鸽抬起翅膀。</p>
        <div class="tutorial-keys" id="tutorial-keys" hidden></div>
        <button class="primary-button" id="tutorial-action" type="button">拍翅试试</button>
      </div>
      <div class="start-card" id="overlay">
        <span class="card-kicker" id="card-kicker">第 1 关 · 江南寄信</span>
        <h2 id="card-title">今日，<br>风很温柔。</h2>
        <p id="card-description">轻点拍翅，避开风筝与屋檐。<br>三连收信可冲刺，通关开启下一程。</p>
        <div class="mission-preview" id="mission-preview">本关目标 · 收集 1 封来信</div>
        <div class="result-stats" id="result-stats" hidden></div>
        <button class="primary-button" id="primary-button" type="button"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5V3Z"/></svg><span id="primary-label">起飞送信</span></button>
        <button class="share-open" id="share-open" type="button" hidden>把这一程寄给朋友</button>
        <span class="start-hint" id="start-hint">点击 / 空格键起飞，音乐随你出发</span>
      </div>

      <div class="inflight-hint" id="inflight-hint" hidden>轻点屏幕 / 空格键，拍动翅膀</div>
      <div class="flight-toast" id="flight-toast" role="status" aria-live="polite"></div>
      <aside class="letter-note" id="letter-note" hidden aria-live="polite" aria-atomic="true"><span>✉ 一封来信</span><p id="letter-note-text"></p></aside>
      <button class="flap-button" id="flap-button" type="button" aria-label="拍动翅膀向上飞" hidden>拍翅</button>
      <div class="scene-label"><span class="scene-label-dot"></span><span id="scene-place">江南 · 晨光</span></div>
    </section>

    <section class="route-card" aria-label="本关进度">
      <div class="route-card-top"><span id="course-title">第 1 关 · 第一封信</span><span><strong id="goal-count">0 / 1</strong><span class="route-total" id="goal-item"> 来信</span></span></div>
      <div class="save-banner" id="save-banner" role="status" aria-live="polite" hidden></div><div class="station-track"><div class="track-base"></div><div class="track-progress" id="track-progress"></div><div class="station" data-station="1"><span class="station-pin">1</span><span>柳岸</span></div><div class="station" data-station="2"><span class="station-pin">2</span><span>小桥</span></div><div class="station" data-station="3"><span class="station-pin">3</span><span>远山</span></div><div class="station" data-station="4"><span class="station-pin">4</span><span>晴川</span></div><div class="station" data-station="5"><span class="station-pin">✉</span><span>云间</span></div></div>
    </section>

    <footer class="controls"><div class="control-guide"><span><kbd>空格</kbd><span class="mobile-key">轻点屏幕</span> 拍动翅膀</span><span class="desktop-guide"><kbd>P</kbd> 暂停</span><span class="desktop-guide"><kbd>R</kbd> 重来</span><span class="desktop-guide"><kbd>H</kbd> 按键</span></div><button type="button" class="restart-button" id="restart-button">重玩本关</button></footer>
    <section class="journey-desk" aria-label="每日挑战与收集">
      <article class="daily-card"><div class="desk-eyebrow"><span>DAILY FLIGHT</span><span id="daily-date"></span></div><h2>今日邮路</h2><p id="daily-description">每天有一条新的航线，完成特别目标就能盖上今日邮戳。</p><div class="daily-bottom"><div class="daily-stamp" id="daily-stamp" aria-label="今日尚未完成">✦</div><div><strong id="daily-status">今日待出发</strong><small id="daily-streak">连续飞行 0 天</small></div><button type="button" id="daily-button">飞今日邮路</button></div></article>
      <article class="album-card"><div class="desk-eyebrow"><span>STAMP ALBUM</span><span id="album-count">0 / 30</span></div><h2>沿途邮戳</h2><p>每抵达一站，就留下一枚属于这段风景的邮戳。</p><div class="stamp-preview" id="stamp-preview" aria-label="本章节邮戳"></div><small id="album-caption">先完成第一关，开启你的邮戳簿。</small></article>
    </section>
    <section class="campaign" id="campaign" aria-labelledby="campaign-title"><div class="campaign-head"><div><span class="card-kicker">关卡地图</span><h2 id="campaign-title">下一站，去哪里？</h2></div><div class="campaign-summary" id="campaign-summary">已过 0 / 30 关 · 0 星</div></div><div class="world-tabs" role="group" aria-label="选择世界"><button type="button" class="world-tab" data-world="1">01 江南寄信</button><button type="button" class="world-tab" data-world="2">02 山海听风</button><button type="button" class="world-tab" data-world="3">03 星河点灯</button></div><p class="world-description" id="world-description"></p><div class="level-grid" id="level-grid" aria-label="关卡选择"></div><p class="campaign-note">每关约半分钟。完成目标即可解锁下一关；多收集、少受伤，可以拿到更多星星。</p></section>
    <p class="screen-reader" id="game-status" aria-live="polite"></p>
    <dialog class="help-dialog" id="help-dialog" aria-labelledby="help-title"><button class="phone-close" id="help-close" type="button" aria-label="关闭按键说明">×</button><span class="card-kicker">操作说明</span><h2 id="help-title">一看就会飞</h2><p>完成关卡收邮戳，再挑战每日邮路。第 4 关起，红色虚线会预告影隼的俯冲高度；提早拍翅或放低，就能闪开。</p><dl><div><dt><kbd>空格</kbd> / <kbd>↑</kbd> / <kbd>W</kbd></dt><dd>拍动翅膀，向上飞</dd></div><div><dt>快速连按 <kbd>空格</kbd> 两次</dt><dd>暂停 / 继续</dd></div><div><dt><kbd>P</kbd></dt><dd>暂停 / 继续</dd></div><div><dt><kbd>R</kbd></dt><dd>重玩本关</dd></div><div><dt><kbd>M</kbd></dt><dd>开关游戏声音</dd></div><div><dt><kbd>H</kbd></dt><dd>打开 / 关闭本说明</dd></div></dl><p class="touch-help">手机：轻点画面或右下角「拍翅」向上飞，右上角按钮暂停。擦翼躲过影隼有额外分数。</p><button type="button" id="help-tutorial" class="primary-button">重新练一次</button></dialog>
    <dialog class="phone-dialog" id="phone-dialog" aria-labelledby="phone-title"><button class="phone-close" id="phone-close" type="button" aria-label="关闭手机打开窗口">×</button><h2 id="phone-title">在手机上闯关</h2><p>用手机相机扫码，在浏览器中打开。</p><img src="./mobile-qr.svg" alt="扫码打开飞鸽传信游戏" width="224" height="224"><label for="phone-link">也可以复制链接到手机</label><input id="phone-link" value="https://sky-post-pigeon-flight.ziyuegaung987.chatgpt.site" readonly><button class="primary-button" id="copy-link" type="button">复制游戏链接</button><p class="phone-sound-note">轻点开始后会播放音乐，记得调高手机媒体音量。</p></dialog>
    <dialog class="share-dialog" id="share-dialog" aria-labelledby="share-title"><button class="phone-close" id="share-close" type="button" aria-label="关闭分享卡片">×</button><div class="share-poster" id="share-poster"><span class="share-kicker">云间来信 · 旅途纪念</span><img src="/pigeon-storybook.webp" alt="" width="130" height="99"><h2 id="share-title">这一程，风很温柔。</h2><p id="share-scene">江南 · 晨光</p><div class="share-seal"><strong id="share-stars">★★★</strong><span id="share-score">旅程得分 0</span></div><small>飞鸽传信 · 云间来信</small></div><p class="share-caption">把这张旅程卡片寄给朋友，也邀请他来飞一程。</p><button type="button" class="primary-button" id="share-action">分享旅程卡片</button><button type="button" class="share-download" id="share-download">保存图片</button><p class="share-feedback" id="share-feedback" role="status"></p></dialog>
  </main>
`;
