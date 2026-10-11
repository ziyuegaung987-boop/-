import { FlightEngine, COURSES } from './engine.mjs';
import { LEVELS, TOTAL_LEVELS } from './levels.mjs';
import { Soundscape } from './soundscape.mjs';
import { paintScene } from './scenery.mjs';
import { createDoubleTapDetector } from './input.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game-canvas'), ctx = canvas.getContext('2d');
const pigeonSprite = new Image(); pigeonSprite.src = '/pigeon-storybook.webp';
const falconSprite = new Image(); falconSprite.src = '/falcon.webp';
const overlay = $('overlay');
let toastTimeout, hintTimeout, noteTimeout, lastTime = 0, visualTime = 0;
let lastMissionMessage = '';
const sound = new Soundscape();
const LETTER_LINES = [
  '今天也辛苦啦。', '不着急，慢慢来。', '记得照顾好自己。',
  '小小的开心也值得收藏。', '愿你今天顺顺利利。', '有空就抬头看看天。',
  '想做的事，试试看。', '停一停，也很好。', '好事正在慢慢发生。',
  '今天的你也很棒。', '给自己留一点好心情。', '希望你睡个好觉。',
  '别忘了喝点水。', '走到这里，已经很了不起。', '下一段路也会有风景。',
  '把烦恼先放一会儿。', '愿你遇见一点惊喜。', '明天再继续，也来得及。',
];
let noteDeck = [], previousNote = -1;
const account = $('account-context');
const signedIn = account.dataset.signedIn === 'true';
const localKey = signedIn ? `pigeon-levels-account-${account.dataset.userKey}` : 'pigeon-levels-v1';
const serverRecords = signedIn ? JSON.parse(account.dataset.records || '[]') : [];
let localRecords = [], guestRecords = [];
try {
  localRecords = JSON.parse(localStorage.getItem(localKey) || '[]');
  guestRecords = signedIn ? JSON.parse(localStorage.getItem('pigeon-levels-v1') || '[]') : [];
} catch {}
if (!Array.isArray(localRecords)) localRecords = [];
if (!Array.isArray(guestRecords)) guestRecords = [];
const records = new Map();
for (const record of [...serverRecords, ...localRecords, ...guestRecords]) {
  if (!Number.isInteger(record.id) || record.id < 1 || record.id > TOTAL_LEVELS || !Number.isInteger(record.stars)) continue;
  const old = records.get(record.id);
  records.set(record.id, { id: record.id, score: Math.max(old?.score || 0, record.score || 0), stars: Math.max(old?.stars || 0, record.stars) });
}
let selectedWorld = 1;
const sceneThumbs = new Map();
function sceneThumbnail(level) {
  if (!sceneThumbs.has(level.id)) {
    const preview = document.createElement('canvas'); preview.width = 360; preview.height = 210;
    paintScene(preview.getContext('2d'), preview.width, preview.height, level);
    sceneThumbs.set(level.id, preview.toDataURL('image/webp', .86));
  }
  return sceneThumbs.get(level.id);
}
let saveQueue = Promise.resolve(), failedSave = null, demoLift = 0;
const spaceGesture = createDoubleTapDetector();
const tutorial = { active: false, step: 0 };
const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dailyStorageKey = `${localKey}-daily`;
let dailyHistory = [], guestDailyHistory = [], serverDailyRecords = [];
try {
  dailyHistory = JSON.parse(localStorage.getItem(dailyStorageKey) || '[]');
  guestDailyHistory = signedIn ? JSON.parse(localStorage.getItem('pigeon-levels-v1-daily') || '[]') : [];
  serverDailyRecords = signedIn ? JSON.parse(account.dataset.dailyRecords || '[]') : [];
} catch {}
if (!Array.isArray(dailyHistory)) dailyHistory = [];
if (!Array.isArray(guestDailyHistory)) guestDailyHistory = [];
if (!Array.isArray(serverDailyRecords)) serverDailyRecords = [];
dailyHistory = [...new Set([...dailyHistory, ...guestDailyHistory, ...serverDailyRecords.map(item => item.day)].filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort();
const dayHash = [...todayKey].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
const dailyLevel = dayHash % Math.min(TOTAL_LEVELS, nextUnlocked()) + 1;
const dailyRules = [
  { name: '三连收集', detail: '同一次飞行连续收集 3 次', test: flight => flight.bestCombo >= 3 },
  { name: '平安抵达', detail: '留下全部 3 颗心', test: flight => flight.hearts === 3 },
  { name: '双星航线', detail: '拿到至少 2 颗星', test: flight => flight.stars >= 2 },
];
const dailyRule = dailyRules[dayHash % dailyRules.length];
let dailyActive = false, dailyOutcome = false;
let dailyQueue = Promise.resolve();

const game = new FlightEngine({ onEvent: event => {
  if (event.type === 'reset') { clearTimeout(toastTimeout); clearTimeout(hintTimeout); clearTimeout(noteTimeout); $('flight-toast').classList.remove('show'); $('letter-note').hidden = true; $('inflight-hint').hidden = true; $('flap-button').hidden = true; $('mission-status').hidden = true; lastMissionMessage = ''; sound.setPlaying(false); }
  if (event.type === 'select') { updateCourse(); selectedWorld = game.course; renderMap(); }
  if (event.type === 'start' || event.type === 'resume') {
    overlay.hidden = true; $('playfield').classList.remove('overlay-open'); $('pause-button').disabled = false;
    $('pause-button').setAttribute('aria-label', '暂停飞行');
    $('pause-button').querySelector('path').setAttribute('d', 'M6 4v12M14 4v12');
    $('flap-button').hidden = false; $('mission-status').hidden = false; updateCourse(); sound.setCourse(game.course); sound.setPlaying(true);
    if (event.type === 'start') sound.effect('start');
    if (event.type === 'start') { $('inflight-hint').hidden = false; hintTimeout = setTimeout(() => $('inflight-hint').hidden = true, 4300); }
    $('game-status').textContent = event.type === 'start' ? '飞行开始。轻点屏幕或按空格键拍动翅膀。' : '继续飞行。';
  }
  if (event.type === 'pause') {
    showOverlay('pause'); $('flap-button').hidden = true; $('mission-status').hidden = true; sound.setPlaying(false);
    $('pause-button').setAttribute('aria-label', '继续飞行');
    $('pause-button').querySelector('path').setAttribute('d', 'M7 4l9 6-9 6V4Z');
  }
  if (event.type === 'collect') {
    sound.effect('collect'); if (game.course === 1) showLetterNote();
    if (event.total >= game.config.goal && event.total - (event.gold ? 2 : 1) < game.config.goal) toast('收集目标完成 · 接下来平安抵达！');
  }
  if (event.type === 'boost') { toast(game.course === 3 ? `${event.combo} 连星光 · 点亮护盾！` : `${event.combo} 连${game.course === 2 ? '风铃' : '收信'} · 顺风冲刺！`); sound.effect('boost'); }
  if (event.type === 'shield-pickup') { toast(`${COURSES[game.course - 1].pickup} · 可以挡住一次碰撞`); sound.effect('shield'); }
  if (event.type === 'updraft-pickup') { toast('乘着上升气流 · 纸鹤轻轻向上'); sound.effect('boost'); }
  if (event.type === 'shield-block') { toast('护盾挡住了危险，继续飞！'); sound.effect('shield'); }
  if (event.type === 'hit') { toast(event.hearts ? `碰到${COURSES[game.course - 1].hazard}了，稳住节奏。` : '先歇一歇，再次出发。'); sound.effect('hit'); }
  if (event.type === 'falcon-warning') { toast('影隼来袭 · 看准红色航线，快变高度！'); sound.effect('warning'); }
  if (event.type === 'near-miss') { toast('擦翼而过 · 勇气 +45'); sound.effect('boost'); }
  if (event.type === 'deliver') {
    const names = COURSES[game.course - 1].stations;
    const course = COURSES[game.course - 1];
    toast(event.station === 5 ? `${names[4]}抵达 · 检查本关目标` : `${names[event.station - 1]}抵达 · ${course.stages[game.stage - 1]}`);
    sound.effect('deliver');
  }
  if (event.type === 'end') {
    if (event.won) { recordCompletion({ id: game.level, score: Math.floor(game.score), stars: event.stars }); }
    dailyOutcome = dailyActive && event.won && dailyRule.test(game);
    if (dailyOutcome && !dailyHistory.includes(todayKey)) {
      dailyHistory.push(todayKey); dailyHistory.sort();
      try { localStorage.setItem(dailyStorageKey, JSON.stringify(dailyHistory)); } catch {}
      renderDaily();
      if (signedIn) queueDailySave(todayKey, dailyLevel, Math.floor(game.score));
    }
    clearTimeout(noteTimeout); $('letter-note').hidden = true;
    showOverlay(event.won ? 'won' : event.reason === 'goal' ? 'goal' : 'lost');
    $('pause-button').disabled = true; $('inflight-hint').hidden = true;
    $('flap-button').hidden = true; $('mission-status').hidden = true; sound.setPlaying(false); sound.effect(event.won ? 'won' : 'lost');
    $('game-status').textContent = event.won ? `第 ${game.level} 关通过，获得 ${event.stars} 星。` : event.reason === 'goal' ? `还差 ${game.config.goal - game.collected} 份${COURSES[game.course - 1].item}，再试一次。` : `本关飞行结束，可以重试。`;
  }
} });
updateCourse();

function nextUnlocked() {
  let next = 1;
  while (next <= TOTAL_LEVELS && records.has(next)) next++;
  return next;
}
function saveLocal() {
  try { localStorage.setItem(localKey, JSON.stringify([...records.values()])); } catch {}
}
function recordCompletion(record) {
  const old = records.get(record.id);
  records.set(record.id, { id: record.id, score: Math.max(old?.score || 0, record.score), stars: Math.max(old?.stars || 0, record.stars) });
  saveLocal(); renderMap();
  if (signedIn) queueSave(record);
  else saveBanner(`第 ${record.id} 关已存到本机 · 登录后可跨设备同步`);
}
function dailyStreak() {
  const days = new Set(dailyHistory), cursor = new Date(`${todayKey}T00:00:00Z`);
  if (!days.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) { count++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return count;
}
function renderDaily() {
  const level = LEVELS[dailyLevel - 1], complete = dailyHistory.includes(todayKey);
  $('daily-date').textContent = todayKey.slice(5).replace('-', ' / ');
  $('daily-description').textContent = `今日航线 · 第 ${dailyLevel} 关「${level.name}」；特别目标：${dailyRule.detail}。明天换一条路。`;
  $('daily-status').textContent = complete ? '今日邮戳已盖好' : `特别目标 · ${dailyRule.name}`;
  $('daily-streak').textContent = `连续飞行 ${dailyStreak()} 天`;
  $('daily-stamp').classList.toggle('is-earned', complete);
  $('daily-stamp').setAttribute('aria-label', complete ? '今日邮戳已获得' : '今日邮戳尚未获得');
  $('daily-button').textContent = complete ? '再飞一次' : '飞今日邮路';
  document.querySelector('.daily-card').style.backgroundImage = `linear-gradient(125deg,#274f59e8,#406f78cb 62%,#69979ba8),url("${sceneThumbnail(level)}")`;
}
function queueDailySave(day, levelId, score) {
  dailyQueue = dailyQueue.then(() => saveQueue).then(async () => {
    const response = await fetch('/api/daily', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day, levelId, score }) });
    if (!response.ok) throw new Error('每日邮戳未同步');
    const result = await response.json();
    serverDailyRecords = result.days;
    if (day === todayKey) saveBanner('今日邮戳已同步到账号 · 明天再来飞一程');
  }).catch(() => { if (day === todayKey) saveBanner('今日邮戳已存本机，账号同步待重试'); });
}
function renderAlbum() {
  $('album-count').textContent = `${records.size} / ${TOTAL_LEVELS}`;
  $('album-caption').textContent = records.size ? `已收下 ${records.size} 枚邮戳 · 本章集齐可翻开下一段风景` : '先完成第一关，开启你的邮戳簿。';
  const tray = $('stamp-preview'); tray.replaceChildren();
  for (const level of LEVELS.filter(item => item.world === selectedWorld)) {
    const stamp = document.createElement('span');
    stamp.className = `postmark ${records.has(level.id) ? 'is-earned' : ''}`;
    stamp.textContent = records.has(level.id) ? ['✉','✤','✦'][selectedWorld - 1] : String(level.number).padStart(2, '0');
    stamp.title = `第 ${level.id} 关 · ${level.scene}${records.has(level.id) ? '，已获得' : '，未获得'}`;
    tray.append(stamp);
  }
}
function renderMap() {
  const next = nextUnlocked(), totalStars = [...records.values()].reduce((sum, item) => sum + item.stars, 0);
  $('campaign-summary').textContent = `已过 ${records.size} / ${TOTAL_LEVELS} 关 · ${totalStars} 星`;
  const label = account.querySelector('.account-progress');
  if (label) label.textContent = `已过 ${records.size} / ${TOTAL_LEVELS} 关 · ${totalStars} 星`;
  document.querySelectorAll('.world-tab').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.world) === selectedWorld));
    button.classList.toggle('world-locked', Number(button.dataset.world) * 10 - 9 > next);
    const world = Number(button.dataset.world);
    button.style.backgroundImage = `linear-gradient(180deg,#1637480a,#172e4cb8),url("${sceneThumbnail(LEVELS[(world - 1) * 10 + 4])}")`;
  });
  $('world-description').textContent = COURSES[selectedWorld - 1].description;
  renderAlbum(); renderDaily();
  const grid = $('level-grid'); grid.replaceChildren();
  for (const level of LEVELS.filter(item => item.world === selectedWorld)) {
    const completed = records.get(level.id), button = document.createElement('button');
    button.type = 'button'; button.className = 'level-tile'; button.disabled = level.id > next;
    button.dataset.world = String(level.world);
    button.classList.toggle('is-current', level.id === game.level);
    button.classList.toggle('is-next', level.id === next);
    button.setAttribute('aria-label', button.disabled ? `第 ${level.id} 关 ${level.scene}，${level.feature}，未解锁` : `第 ${level.id} 关 ${level.name}，${level.scene}，${level.feature}，${completed ? `${completed.stars}星` : '待挑战'}`);
    const number = document.createElement('strong'); number.textContent = String(level.id).padStart(2, '0');
    const title = document.createElement('span'); title.textContent = level.name;
    const scene = document.createElement('em'); scene.textContent = level.scene;
    const feature = document.createElement('b'); feature.className = 'tile-feature'; feature.textContent = level.feature;
    const stars = document.createElement('small'); stars.textContent = completed ? '★'.repeat(completed.stars) + '☆'.repeat(3 - completed.stars) : button.disabled ? '🔒' : '开始挑战';
    button.style.backgroundImage = `linear-gradient(180deg,#1737490a 0%,#102e40bc 100%),url("${sceneThumbnail(level)}")`;
    button.append(number, title, scene, feature, stars);
    button.addEventListener('click', () => selectLevel(level.id));
    grid.append(button);
  }
}
function selectLevel(levelId) {
  if (levelId > nextUnlocked()) return;
  if (tutorial.active) closeTutorial(false);
  if (game.state === 'playing') game.pause();
  dailyActive = false;
  game.selectLevel(levelId); showOverlay('ready');
  $('playfield').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function saveBanner(text, retry = false) {
  const banner = $('save-banner'); banner.hidden = false;
  banner.replaceChildren(document.createTextNode(text));
  if (retry) { const button = document.createElement('button'); button.type = 'button'; button.textContent = '重试保存'; button.addEventListener('click', () => failedSave && queueSave(failedSave)); banner.append(' ', button); }
}

function queueSave(record) {
  saveQueue = saveQueue.then(async () => {
    saveBanner(`第 ${record.id} 关 · 正在同步`);
    const response = await fetch('/api/campaign', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ levelId: record.id, score: record.score, stars: record.stars }),
    });
    if (!response.ok) throw new Error('进度暂时没能保存');
    const campaign = await response.json();
    failedSave = null;
    for (const saved of campaign.levels) {
      const old = records.get(saved.id);
      records.set(saved.id, { id: saved.id, score: Math.max(saved.score, old?.score || 0), stars: Math.max(saved.stars, old?.stars || 0) });
    }
    renderMap(); saveBanner(`第 ${record.id} 关 · 已保存到账号`);
  }).catch(() => { failedSave = record; saveBanner(`第 ${record.id} 关在本机已保存，账号同步待重试`, true); });
}

function updateCourse() {
  const course = COURSES[game.course - 1];
  $('course-title').textContent = `第 ${game.level} 关 · ${game.config.name}`;
  $('scene-place').textContent = game.config.scene;
  $('route-origin').textContent = course.title;
  $('route-destination').textContent = game.config.name;
  $('journey-duration').textContent = `第 ${game.level} / ${TOTAL_LEVELS} 关 · ${game.config.scene}`;
  $('collect-icon').textContent = ['✉', '♫', '✦'][game.course - 1];
  $('collect-caption').textContent = course.item;
  $('goal-item').textContent = ` ${course.item}`;
  $('distance-total').textContent = `/ ${game.config.distance} 米`;
  $('mission-preview').textContent = `收集 ${game.config.goal} ${course.unit}${course.item} · ${game.config.feature}`;
  $('shield-badge').textContent = course.pickup;
  $('flap-button').setAttribute('aria-label', `让${course.role}向上飞`);
  canvas.setAttribute('aria-label', `${course.role}飞行画面。点击或按空格向上飞，快速双击空格或按 P 暂停。`);
  document.querySelectorAll('.station').forEach((el, i) => el.lastElementChild.textContent = course.stations[i]);
  document.body.dataset.course = String(game.course);
  document.body.dataset.sky = game.config.sky;
}

function toast(text) {
  clearTimeout(toastTimeout); $('flight-toast').textContent = text;
  $('flight-toast').classList.add('show');
  toastTimeout = setTimeout(() => $('flight-toast').classList.remove('show'), 2300);
}

function showLetterNote() {
  if (!noteDeck.length) {
    noteDeck = LETTER_LINES.map((_, index) => index);
    for (let i = noteDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [noteDeck[i], noteDeck[j]] = [noteDeck[j], noteDeck[i]];
    }
    if (noteDeck[noteDeck.length - 1] === previousNote) [noteDeck[0], noteDeck[noteDeck.length - 1]] = [noteDeck[noteDeck.length - 1], noteDeck[0]];
  }
  previousNote = noteDeck.pop();
  $('letter-note-text').textContent = `“${LETTER_LINES[previousNote]}”`;
  $('letter-note').hidden = false;
  clearTimeout(noteTimeout);
  noteTimeout = setTimeout(() => { $('letter-note').hidden = true; }, 3800);
}

function showOverlay(type) {
  overlay.hidden = false;
  $('playfield').classList.add('overlay-open');
  $('result-stats').hidden = type !== 'won' && type !== 'lost' && type !== 'goal';
  $('share-open').hidden = type !== 'won';
  $('mission-preview').hidden = type === 'pause';
  $('start-hint').hidden = false;
  if (type === 'ready') {
    const course = COURSES[game.course - 1];
    $('card-kicker').textContent = `${course.title} · 第 ${game.level} / ${TOTAL_LEVELS} 关`;
    $('card-title').textContent = game.config.name;
    $('card-description').textContent = game.config.story;
    $('primary-label').textContent = ['开始送信', '乘风寻铃', '出发点灯'][game.course - 1];
    $('start-hint').textContent = '点击 / 空格键起飞，音乐随你出发';
    if (dailyActive) {
      $('card-kicker').textContent = `今日邮路 · 第 ${game.level} 关`;
      $('mission-preview').textContent = `今日目标 · ${dailyRule.detail} · ${game.config.feature}`;
      $('start-hint').textContent = '这趟飞行也会计入普通关卡记录';
    }
  } else if (type === 'pause') {
    $('card-kicker').textContent = `第 ${game.level} 关 · 暂停`; $('card-title').innerHTML = '歇一歇，<br>再出发。';
    $('card-description').textContent = `目标 ${game.config.goal} ${COURSES[game.course - 1].unit}${COURSES[game.course - 1].item}，目前已收集 ${game.collected}。`;
    $('primary-label').textContent = '继续飞行'; $('start-hint').textContent = '按 P 或快速双击空格继续';
  } else {
    const won = type === 'won', course = COURSES[game.course - 1];
    $('card-kicker').textContent = `第 ${game.level} 关 · ${won ? '挑战完成' : '挑战未完成'}`;
    $('card-title').innerHTML = won ? `获得 ${'★'.repeat(game.stars)}<br>继续前进。` : type === 'goal' ? '到达终点，<br>还差一点。' : '风有点大，<br>再试一关。';
    $('card-description').textContent = won
      ? (game.level === TOTAL_LEVELS ? '三十关全部点亮！你可以从地图重玩每关，挑战更多星星。' : `下一关：${LEVELS[game.level].name}。也可以从关卡地图重玩，争取三星。`)
      : type === 'goal'
        ? `还差 ${game.config.goal - game.collected} ${course.unit}${course.item}。下次先追上成组的${course.item}，收够目标再专心避险。`
        : game.course === 1 && game.level >= 4
          ? '这次用完了三颗爱心。看到影隼的红线，提前飞离那条高度；也要避开风筝。'
          : `这次用完了三颗爱心。轻拍一次会抬升，停一停就会下降；看到${course.hazard}先调整高度。`;
    $('result-stats').innerHTML = `<div><strong>${Math.min(game.collected, game.config.goal)} / ${game.config.goal}</strong>目标收集</div><div><strong>${game.bestCombo}</strong>最高连收</div><div><strong>${Math.floor(game.score)}</strong>旅程得分</div>`;
    $('primary-label').textContent = won ? game.level < TOTAL_LEVELS ? `下一关 · ${LEVELS[game.level].name}` : '重玩第一关' : '再挑战一次';
    $('start-hint').textContent = won ? '点击 / 空格键前往下一关 · R 重玩本关' : '点击 / 空格键重试 · R 重玩本关';
    if (dailyActive && won) {
      $('card-kicker').textContent = dailyOutcome ? '今日邮路 · 特别目标完成' : '今日邮路 · 特别目标待完成';
      $('card-title').textContent = dailyOutcome ? '今天的风，也替你盖章。' : '到站了，再挑战一次。';
      $('card-description').textContent = dailyOutcome ? `第 ${game.level} 关「${game.config.name}」已送达。今日邮戳收进手账，明天还有新航线。` : `已完成关卡，还需要${dailyRule.detail}，才能拿到今日邮戳。`;
      $('primary-label').textContent = dailyOutcome ? '继续下一关' : '再飞今日邮路';
    }
  }
}

function unlockSound() { if (sound.enabled) void sound.unlock().catch(() => { sound.setEnabled(false); updateSoundButton(); toast('点一下右上角喇叭，重新开启声音。'); }); }
function start() { unlockSound(); game.start(); canvas.focus({ preventScroll: true }); }
function advance() { dailyActive = false; unlockSound(); game.nextLevel(); selectedWorld = game.course; renderMap(); canvas.focus({ preventScroll: true }); }
function restart() { unlockSound(); if (game.state === 'playing') game.pause(); game.selectLevel(game.level); game.start(); canvas.focus({ preventScroll: true }); }
function primary() {
  if (game.state === 'paused') { unlockSound(); game.pause(); canvas.focus({ preventScroll: true }); }
  else if (game.state === 'won') {
    if (dailyActive && !dailyOutcome) { game.selectLevel(game.level); start(); }
    else advance();
  }
  else if (game.state === 'lost') { unlockSound(); game.retryLevel(); canvas.focus({ preventScroll: true }); }
  else start();
}
function pause() {
  if (tutorial.active) { if (tutorial.step === 1) setTutorialStep(2); return; }
  if (game.state === 'playing' || game.state === 'paused') { unlockSound(); game.pause(); if (game.state === 'playing') canvas.focus({ preventScroll: true }); }
}
function setTutorialStep(step) {
  tutorial.step = step;
  if (step === 1) spaceGesture.reset();
  $('tutorial-progress').textContent = `${step + 1} / 3 · 试飞教学`;
  const title = ['先试着飞一下', '让时间停一停', '认认沿途的按键'][step];
  const description = [
    `按一下空格键，或轻点画面，让${COURSES[game.course - 1].role}向上飞。`,
    '电脑快速连按两次空格键；手机点「暂停」按钮。',
    '空格 / ↑ / W 拍翅，P 暂停，R 重玩，M 声音，H 帮助。完成目标才解锁下一关，登录后自动保存。',
  ][step];
  $('tutorial-title').textContent = title;
  $('tutorial-description').textContent = description;
  $('tutorial-action').textContent = ['拍翅试试', '演示暂停', '开始正式飞行'][step];
  const keys = $('tutorial-keys'); keys.hidden = step !== 2;
  if (step === 2) keys.textContent = '手机：轻点画面或拍翅按钮；右上角暂停。电脑：空格 / ↑ / W 拍翅，双空格 / P 暂停。';
  $('pause-button').disabled = step !== 1;
}
function showTutorial() {
  if (game.state === 'playing') game.pause();
  game.selectLevel(game.level);
  tutorial.active = true; spaceGesture.reset();
  overlay.hidden = true; $('tutorial').hidden = false; $('playfield').classList.add('overlay-open');
  $('flap-button').hidden = false; setTutorialStep(0);
}
function closeTutorial(startFlight = false) {
  tutorial.active = false; $('tutorial').hidden = true; $('flap-button').hidden = true;
  try { localStorage.setItem('pigeon-tutorial-seen-v4', '1'); } catch {}
  $('pause-button').disabled = true;
  if (startFlight) start(); else showOverlay('ready');
}
function flap() {
  if (tutorial.active) {
    if (tutorial.step === 0) { unlockSound(); demoLift = 60; sound.effect('flap'); setTutorialStep(1); }
    return;
  }
  unlockSound();
  if (game.state === 'playing') { game.flap(); sound.effect('flap'); }
  else if (game.state === 'paused') return;
  else if (game.state === 'won') advance();
  else primary();
}
function updateHud() {
  $('distance').textContent = Math.floor(game.distance);
  $('mail-count').textContent = `${game.collected} / ${game.config.goal}`;
  $('mail-progress').setAttribute('aria-label', `已收集 ${game.collected} ${COURSES[game.course - 1].unit}${COURSES[game.course - 1].item}，目标 ${game.config.goal} ${COURSES[game.course - 1].unit}`);
  $('goal-count').textContent = `${Math.min(game.collected, game.config.goal)} / ${game.config.goal}`;
  $('flight-track-fill').style.width = `${Math.min(100, game.distance / game.config.distance * 100)}%`;
  if (game.state === 'playing') {
    const remaining = Math.max(0, game.config.goal - game.collected);
    const warning = game.falcon?.phase === 'warning';
    const urgent = remaining > 0 && game.distance / game.config.distance > .72;
    const message = warning ? '影隼要沿红线俯冲 · 快换高度' : remaining ? `还差 ${remaining} ${COURSES[game.course - 1].unit}${COURSES[game.course - 1].item}` : '目标完成 · 平安飞到终点';
    if (message !== lastMissionMessage) { $('mission-status').textContent = message; lastMissionMessage = message; }
    $('mission-status').classList.toggle('is-warning', warning);
    $('mission-status').classList.toggle('is-urgent', urgent && !warning);
    $('mission-status').classList.toggle('is-complete', !remaining && !warning);
  }
  const heartNodes = $('hearts').children;
  for (let i = 0; i < 3; i++) heartNodes[i].classList.toggle('lost', i >= game.hearts);
  $('hearts').setAttribute('aria-label', `剩余${game.hearts}次飞行机会`);
  document.querySelectorAll('.station').forEach((el, i) => el.classList.toggle('done', i < game.delivered));
  $('track-progress').style.width = `${Math.max(0, Math.min(100, (game.distance / game.config.distance - .2) * 125))}%`;
  $('combo-badge').hidden = game.combo < 2 || game.state !== 'playing';
  $('combo-badge').textContent = `${game.combo} 连收`;
  $('shield-badge').hidden = !game.shield || game.state !== 'playing';
  $('updraft-badge').hidden = !game.updraft || game.state !== 'playing';
  $('boost-badge').hidden = !game.boost || game.state !== 'playing';
}

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); game.resize(width, height);
}
new ResizeObserver(resize).observe(canvas);
resize();

function draw() {
  const w = game.width, h = game.height;
  ctx.clearRect(0, 0, w, h);
  const course = game.course;
  paintScene(ctx, w, h, game.config, visualTime, game.distance);
  drawWeather(w, h, game.config.sky);
  drawAmbient(w, h, course);
  if (game.state === 'playing' || game.state === 'paused' || game.state === 'lost' || game.state === 'won') {
    for (const kite of game.kites) {
      const y = kite.y + Math.sin(game.elapsed * (course === 3 ? 2.65 : 2) + kite.phase) * (kite.amplitude ?? 12);
      drawHazard(kite.x, y, course);
    }
    for (const letter of game.letters) {
      const y = letter.y + Math.sin(game.elapsed * 2 + letter.phase) * 6;
      drawCollectible(letter.x, y, course, letter.gold);
    }
    for (const feather of game.feathers) {
      const y = feather.y + Math.sin(game.elapsed * 2 + feather.phase) * 9;
      drawPickup(feather.x, y, course);
    }
    for (const p of game.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.gold ? '#fff0aa' : '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.gold ? 3 : 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (game.falcon) drawFalcon(game.falcon, w);
  }
  const ready = game.state === 'ready';
  const x = ready ? w * (w > 700 ? .73 : .70) : game.bird.x;
  const y = ready ? h * (w > 700 ? .36 : .22) + Math.sin(visualTime * 2) * 7 - demoLift : game.bird.y;
  ctx.save(); ctx.translate(x, y);
  const tilt = ready ? Math.sin(visualTime) * .04 : Math.max(-.30, Math.min(.40, game.bird.vy / h * .65));
  ctx.rotate(tilt);
  if (game.shield || game.boost > 0 || game.updraft > 0) {
    ctx.beginPath(); ctx.arc(0, 0, game.radius + 14, 0, Math.PI * 2);
    ctx.fillStyle = game.updraft ? '#80e7e545' : game.boost ? '#fff3a52b' : '#aaffef33'; ctx.fill();
    ctx.strokeStyle = game.updraft ? '#b8fffb' : game.boost ? '#fff6b8' : '#afffec'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  if (game.invincible > 0) {
    ctx.globalAlpha = .65 + Math.sin(visualTime * 30) * .3;
    ctx.beginPath(); ctx.arc(0, 0, game.radius + 15, 0, Math.PI * 2); ctx.strokeStyle = '#fff9'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.shadowColor = '#255d7b35'; ctx.shadowBlur = 15; ctx.shadowOffsetY = 6;
  drawPlayer(course, ready ? (w > 700 ? 100 : 71) : game.radius * 2.6);
  ctx.restore();
  if (ready && w > 700) {
    drawCollectible(w * .80, h * .30, course, true);
    drawCollectible(w * .64, h * .43, course, false);
  }
}

function drawWeather(w, h, sky) {
  ctx.save();
  if (sky === 'sunset' || sky === 'gold' || sky === 'dusk' || sky === 'dawn') {
    const glow = ctx.createLinearGradient(0, 0, 0, h);
    glow.addColorStop(0, sky === 'dusk' ? '#51427a2b' : '#ffcc8738'); glow.addColorStop(.75, '#f6a77610'); glow.addColorStop(1, '#ffffff00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  }
  if (sky === 'mist') {
    const haze = ctx.createLinearGradient(0, h*.30, 0, h);
    haze.addColorStop(0, '#f7fffe00'); haze.addColorStop(.65, '#edfaf77a'); haze.addColorStop(1, '#f7fffe22');
    ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
  }
  if (sky === 'rain' || sky === 'storm') {
    ctx.strokeStyle = sky === 'storm' ? '#e6e8ff58' : '#e7f8ff8a'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 35; i++) {
      const x = ((i * 79 - visualTime * (sky === 'storm' ? 260 : 175)) % (w+80) + w+80) % (w+80) - 30;
      const y = (i * 113 + visualTime * 185) % (h + 35) - 25;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-10,y+23); ctx.stroke();
    }
  }
  if (sky === 'blossom' || sky === 'sparkle' || sky === 'meteor' || sky === 'wind') {
    const count = sky === 'meteor' ? 9 : sky === 'wind' ? 7 : 18;
    for (let i = 0; i < count; i++) {
      const x = ((i * 173 - visualTime * (sky === 'wind' ? 56 : 25)) % (w + 90) + w + 90) % (w + 90) - 30;
      const y = (i * 97 + Math.sin(visualTime + i) * 17) % h;
      if (sky === 'wind' || sky === 'meteor') {
        ctx.strokeStyle = sky === 'meteor' ? '#fff5d5b8' : '#efffffa3'; ctx.lineWidth = sky === 'meteor' ? 1.8 : 1.2;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x - (sky === 'meteor' ? 34 : 52), y + (sky === 'meteor' ? 17 : 4)); ctx.stroke();
      } else {
        ctx.fillStyle = sky === 'blossom' ? '#ffe5e9c9' : '#fff2bdd9';
        ctx.beginPath(); ctx.ellipse(x,y,sky === 'blossom' ? 4 : 2.5,sky === 'blossom' ? 2.5 : 2.5,visualTime+i,0,Math.PI*2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawFalcon(falcon, w) {
  ctx.save();
  if (falcon.phase === 'warning') {
    const pulse = .55 + Math.sin(visualTime * 13) * .18;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#9d4c40'; ctx.lineWidth = 2; ctx.setLineDash([7, 8]);
    ctx.beginPath(); ctx.moveTo(w * .15, falcon.y); ctx.lineTo(w - 18, falcon.y); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#9d4c40';
    ctx.beginPath(); ctx.moveTo(w - 19, falcon.y - 9); ctx.lineTo(w - 8, falcon.y); ctx.lineTo(w - 19, falcon.y + 9); ctx.fill();
  } else if (falconSprite.complete && falconSprite.naturalWidth) {
    const width = w < 500 ? 78 : 108, height = width * falconSprite.naturalHeight / falconSprite.naturalWidth;
    ctx.shadowColor = '#132e4a55'; ctx.shadowBlur = 15;
    ctx.drawImage(falconSprite, falcon.x - width / 2, falcon.y - height / 2, width, height);
  }
  ctx.restore();
}

function drawAmbient(w, h, course) {
  if (course === 1) return;
  ctx.save();
  if (course === 2) {
    for (let i = 0; i < 5; i++) {
      const x = ((i * 311 - visualTime * (18 + i * 3)) % (w + 340) + w + 340) % (w + 340) - 90;
      const y = h * (.22 + (i % 3) * .15);
      ctx.strokeStyle = '#fff8e799'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 37, y - 15, x + 65, y + 13, x + 100, y); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 20; i++) {
      const x = (i * 181.17 % w), y = h * (.13 + ((i * 47) % 65) / 100);
      const a = .16 + .38 * (1 + Math.sin(visualTime * (1.1 + i % 4 * .3) + i * 2)) / 2;
      ctx.fillStyle = `rgba(255,238,194,${a})`;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawHazard(x, y, course) {
  if (course === 1) { glyph('🪁', x, y, 53); return; }
  ctx.save(); ctx.translate(x, y);
  if (course === 2) {
    ctx.shadowColor = '#465b84'; ctx.shadowBlur = 9; ctx.fillStyle = '#51647d';
    for (const [cx,cy,r] of [[-15,4,15],[-3,-5,21],[17,1,17]]) { ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); }
    ctx.fillRect(-27,1,52,13); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff0a6'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(3,10); ctx.lineTo(-4,24); ctx.lineTo(6,21); ctx.lineTo(0,35); ctx.stroke();
  } else {
    ctx.rotate(-.55); ctx.shadowColor = '#ffb28f'; ctx.shadowBlur = 15;
    const tail = ctx.createLinearGradient(-49,0,19,0); tail.addColorStop(0,'#e9aa8a00'); tail.addColorStop(1,'#ffd1a8d0');
    ctx.fillStyle = tail; ctx.beginPath(); ctx.moveTo(-55,-8); ctx.lineTo(3,-15); ctx.lineTo(3,15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe6bd'; ctx.beginPath(); ctx.arc(12,0,15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#dc8d87'; ctx.beginPath(); ctx.arc(12,0,8,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawCollectible(x, y, course, gold) {
  ctx.save(); ctx.translate(x,y);
  ctx.shadowColor = course === 3 ? '#ffe5ad' : '#fff3bd'; ctx.shadowBlur = gold ? 19 : 9;
  ctx.fillStyle = course === 3 ? '#ffe3a766' : gold ? '#ffe7a6ee' : '#fff9dfe8';
  ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = course === 2 ? '#e9ecf4' : gold ? '#dfad43' : '#ecc786'; ctx.lineWidth = gold ? 2.5 : 1.5; ctx.stroke();
  ctx.shadowBlur = 0;
  if (course === 1) glyph('✉', 0, 0, 27, gold ? '#ab7421' : '#a57937');
  else if (course === 2) {
    ctx.strokeStyle = gold ? '#995988' : '#536b87'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13,-8); ctx.quadraticCurveTo(0,-15,13,-8); ctx.moveTo(-8,-6); ctx.lineTo(-8,8); ctx.moveTo(0,-9);ctx.lineTo(0,12);ctx.moveTo(8,-6);ctx.lineTo(8,8);ctx.stroke();
    for (const [cx,cy] of [[-8,10],[0,14],[8,10]]) {ctx.fillStyle=gold?'#e29d6c':'#89b7b8';ctx.beginPath();ctx.arc(cx,cy,3.4,0,Math.PI*2);ctx.fill();}
  } else {
    ctx.fillStyle = gold ? '#fff4bc' : '#f9e7cb'; ctx.beginPath();
    for (let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?6:16;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

function drawPickup(x, y, course) {
  ctx.save(); ctx.translate(x,y); ctx.shadowColor='#89fff0'; ctx.shadowBlur=15;
  ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fillStyle=course===2?'#c2ffffcc':'#e3fffae8';ctx.fill();
  ctx.strokeStyle='#74d3c7';ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;
  if(course===2){ctx.strokeStyle='#378d92';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-11,7);ctx.bezierCurveTo(-11,-7,1,-15,8,-7);ctx.bezierCurveTo(18,3,3,12,0,3);ctx.stroke();}
  else if(course===3){glyph('✦',0,0,29,'#64c7d1');}
  else glyph('🪶',0,0,29);
  ctx.restore();
}

function drawPlayer(course, size) {
  if (course === 1) {
    if (!pigeonSprite.complete || !pigeonSprite.naturalWidth) { drawPigeon(size); return; }
    const width = size * (game.state === 'ready' ? 1.7 : 2.15);
    const height = width * pigeonSprite.naturalHeight / pigeonSprite.naturalWidth;
    ctx.save();
    ctx.rotate(Math.sin(visualTime * (game.state === 'playing' ? 8 : 3)) * .025);
    ctx.drawImage(pigeonSprite, -width / 2, -height / 2, width, height);
    ctx.restore();
    return;
  }
  ctx.save(); ctx.scale(size/65,size/65);
  if (course === 2) {
    ctx.shadowColor='#49687966';ctx.shadowBlur=9;ctx.fillStyle='#fffaf0';ctx.strokeStyle='#527083';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(-33,-15);ctx.lineTo(-1,5);ctx.lineTo(-12,-28);ctx.lineTo(9,-6);ctx.lineTo(27,-17);ctx.lineTo(18,9);ctx.lineTo(32,14);ctx.lineTo(8,13);ctx.lineTo(-7,27);ctx.lineTo(-4,8);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-33,-15);ctx.lineTo(-4,8);ctx.lineTo(-12,-28);ctx.moveTo(-4,8);ctx.lineTo(27,-17);ctx.stroke();
    ctx.fillStyle='#d98862';ctx.beginPath();ctx.moveTo(27,-17);ctx.lineTo(38,-15);ctx.lineTo(25,-12);ctx.fill();
  } else {
    ctx.shadowColor='#ffcf9b';ctx.shadowBlur=23;ctx.fillStyle='#fff1ba';ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#e8a874';ctx.beginPath();ctx.moveTo(-23,-17);ctx.quadraticCurveTo(0,-31,23,-17);ctx.lineTo(18,21);ctx.quadraticCurveTo(0,31,-18,21);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff0bb';ctx.beginPath();ctx.moveTo(-17,-14);ctx.quadraticCurveTo(0,-22,17,-14);ctx.lineTo(13,18);ctx.quadraticCurveTo(0,24,-13,18);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#b96f69';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,23);ctx.lineTo(0,34);ctx.lineTo(13,23);ctx.moveTo(-18,-17);ctx.quadraticCurveTo(0,-38,18,-17);ctx.stroke();
    ctx.fillStyle='#ef9b6a';ctx.beginPath();ctx.arc(0,-16,4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawPigeon(size) {
  // A right-facing side view, so the bird always looks where the level moves.
  const wing = Math.sin(visualTime * (game.state === 'playing' ? 13 : 4.5)) * 8;
  ctx.save(); ctx.scale(size / 65, size / 65);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.8;

  // Three tapering tail feathers point behind the bird.
  ctx.fillStyle = '#d9e4e6'; ctx.strokeStyle = '#688b92';
  ctx.beginPath(); ctx.moveTo(-19, 5); ctx.lineTo(-41, -6); ctx.lineTo(-34, 5); ctx.lineTo(-42, 11); ctx.lineTo(-17, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-32, 5); ctx.lineTo(-41, 10); ctx.moveTo(-29, 8); ctx.lineTo(-37, -1); ctx.stroke();

  // The far wing sits behind the chest.
  ctx.fillStyle = '#cbdde1'; ctx.strokeStyle = '#75969b';
  ctx.beginPath(); ctx.moveTo(-12, 3); ctx.quadraticCurveTo(-23, -19 - wing, -16, -31 - wing);
  ctx.quadraticCurveTo(-3, -31 - wing, 8, -6); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Long horizontal body, curved neck, and a distinctly right-facing head.
  ctx.fillStyle = '#fffdf4'; ctx.strokeStyle = '#5f848c';
  ctx.beginPath(); ctx.ellipse(-5, 4, 25, 16, -.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 8); ctx.quadraticCurveTo(14, -1, 14, -13);
  ctx.quadraticCurveTo(22, -20, 28, -11); ctx.quadraticCurveTo(27, 0, 17, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(24, -13, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Orange beak and one visible eye make the direction unmistakable.
  ctx.fillStyle = '#e69b67'; ctx.strokeStyle = '#ad714f'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(32, -14); ctx.lineTo(43, -11); ctx.lineTo(32, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#233f49'; ctx.beginPath(); ctx.arc(27, -17, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(27.6, -17.7, .7, 0, Math.PI * 2); ctx.fill();

  // A near wing flaps over the body; the small gold stroke suggests a letter.
  ctx.fillStyle = '#f2f8f7'; ctx.strokeStyle = '#73959b'; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-19, -17 - wing, -5, -27 - wing);
  ctx.quadraticCurveTo(8, -26 - wing, 12, -6); ctx.quadraticCurveTo(0, 10, -14, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b4c7c8'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-8, -2); ctx.quadraticCurveTo(1, -10 - wing, 4, -19 - wing); ctx.stroke();
  ctx.fillStyle = '#fff4d9'; ctx.strokeStyle = '#be9663';
  ctx.beginPath(); ctx.rect(-8, 14, 14, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, 15); ctx.lineTo(-1, 19); ctx.lineTo(6, 15); ctx.stroke();
  ctx.restore();
}

function glyph(text, x, y, size, color = '#ffffff') {
  ctx.save(); ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}

function frame(time) {
  const dt = lastTime ? (time - lastTime) / 1000 : 0; lastTime = time; visualTime += Math.min(dt, .05);
  demoLift = Math.max(0, demoLift - dt * 120);
  game.tick(dt); updateHud(); draw(); window.requestAnimationFrame(frame);
}
window.requestAnimationFrame(frame);

$('primary-button').addEventListener('click', primary);
$('daily-button').addEventListener('click', () => {
  if (tutorial.active) closeTutorial(false);
  if (game.state === 'playing') game.pause();
  dailyActive = true; dailyOutcome = false;
  game.selectLevel(dailyLevel); showOverlay('ready');
  $('playfield').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('restart-button').addEventListener('click', restart);
$('pause-button').addEventListener('click', pause);
$('flap-button').addEventListener('click', flap);
canvas.addEventListener('pointerdown', event => { event.preventDefault(); flap(); });
window.addEventListener('keydown', event => {
  if (phoneDialog.open || shareDialog.open || event.target instanceof HTMLInputElement) return;
  if ($('help-dialog').open) { if (event.code === 'KeyH') { event.preventDefault(); $('help-dialog').close(); } return; }
  if (event.target instanceof HTMLButtonElement && (event.code === 'Space' || event.code === 'Enter')) return;
  if (event.code === 'Space') {
    event.preventDefault(); if (event.repeat) return;
    const double = spaceGesture.tap(performance.now());
    if (tutorial.active) { if (tutorial.step === 0) flap(); else if (tutorial.step === 1 && double) setTutorialStep(2); return; }
    if (double && (game.state === 'playing' || game.state === 'paused')) pause();
    else if (game.state !== 'paused') flap();
    return;
  }
  if (event.code === 'ArrowUp' || event.code === 'KeyW') { event.preventDefault(); if (!event.repeat) flap(); }
  if (event.code === 'KeyP' || event.code === 'Escape') { event.preventDefault(); if (!event.repeat) pause(); }
  if (event.code === 'KeyR') { event.preventDefault(); if (!event.repeat && !tutorial.active) restart(); }
  if (event.code === 'KeyM') { event.preventDefault(); if (!event.repeat) $('sound-button').click(); }
  if (event.code === 'KeyH') { event.preventDefault(); if (!event.repeat) openHelp(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') game.pause(); lastTime = 0; });
// A flight should never continue while the player is reading the map below it.
new IntersectionObserver(entries => {
  if (entries[0].intersectionRatio < .3 && game.state === 'playing') {
    game.pause();
    $('card-description').textContent = '飞行画面离开视线，已为你暂停。回来后点击继续飞行。';
  }
}, { threshold: .3 }).observe($('playfield'));

function updateSoundButton() {
  $('sound-label').textContent = sound.enabled ? '声音开启' : '声音关闭';
  $('sound-button').setAttribute('aria-pressed', String(sound.enabled));
  $('sound-button').setAttribute('aria-label', sound.enabled ? '关闭游戏声音' : '开启游戏声音');
  $('sound-lines').setAttribute('d', sound.enabled ? 'M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14' : 'm16 9 5 6m0-6-5 6');
}
$('sound-button').addEventListener('click', () => {
  sound.setEnabled(!sound.enabled); updateSoundButton();
  if (sound.enabled) void sound.unlock().then(() => sound.effect('collect')).catch(() => { sound.setEnabled(false); updateSoundButton(); toast('声音暂未开启，请在手机浏览器中打开后再试。'); });
});
updateSoundButton();

const phoneDialog = $('phone-dialog');
$('phone-button').addEventListener('click', () => { if (game.state === 'playing') game.pause(); phoneDialog.showModal(); });
$('phone-close').addEventListener('click', () => phoneDialog.close());
phoneDialog.addEventListener('click', event => { if (event.target === phoneDialog) phoneDialog.close(); });
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('phone-link').value); $('copy-link').textContent = '已复制链接'; }
  catch { $('phone-link').focus(); $('phone-link').select(); $('copy-link').textContent = '长按链接即可复制'; }
});

const shareDialog = $('share-dialog');
let shareBlob = null;
async function makeShareImage() {
  const card = document.createElement('canvas'); card.width = 900; card.height = 1200;
  const pen = card.getContext('2d'), course = COURSES[game.course - 1];
  pen.fillStyle = ['#b6dbe4','#d2b9bb','#2f375f'][game.course - 1]; pen.fillRect(0, 0, 900, 1200);
  paintScene(pen, 900, 1200, game.config);
  const shade = pen.createLinearGradient(0, 0, 0, 1200); shade.addColorStop(0, '#102e3b11'); shade.addColorStop(.42, '#1c3e4722'); shade.addColorStop(1, '#0e2d3dcc');
  pen.fillStyle = shade; pen.fillRect(0, 0, 900, 1200);
  pen.strokeStyle = '#fffae6'; pen.lineWidth = 15; pen.strokeRect(20, 20, 860, 1160);
  if (pigeonSprite.complete && pigeonSprite.naturalWidth) pen.drawImage(pigeonSprite, 550, 165, 280, 215);
  pen.fillStyle = '#fffaf1'; pen.font = '600 28px serif'; pen.fillText('云间来信  /  旅途纪念', 85, 110);
  pen.font = '600 66px "Songti SC", serif'; pen.fillText(game.config.name, 85, 875);
  pen.font = '32px sans-serif'; pen.fillText(`${course.title} · ${game.config.scene}`, 88, 937);
  pen.font = '600 42px sans-serif'; pen.fillStyle = '#ffdb91'; pen.fillText('★'.repeat(game.stars) + '☆'.repeat(3 - game.stars), 85, 1010);
  pen.fillStyle = '#fffaf1'; pen.font = '28px sans-serif'; pen.fillText(`第 ${game.level} 关  ·  ${Math.floor(game.score)} 分  ·  擦翼 ${game.nearMisses} 次`, 88, 1072);
  pen.font = '24px sans-serif'; pen.fillText('飞鸽传信 · 和朋友一起，把下一封信送到远方', 88, 1135);
  return new Promise(resolve => card.toBlob(resolve, 'image/png'));
}
$('share-open').addEventListener('click', () => {
  $('share-title').textContent = game.config.name;
  $('share-scene').textContent = `${COURSES[game.course - 1].title} · ${game.config.scene}`;
  $('share-stars').textContent = '★'.repeat(game.stars) + '☆'.repeat(3 - game.stars);
  $('share-score').textContent = `${Math.floor(game.score)} 分 · 擦翼 ${game.nearMisses} 次`;
  $('share-poster').style.backgroundImage = `linear-gradient(180deg,#18343b17 20%,#163744bb),url("${sceneThumbnail(game.config)}")`;
  $('share-feedback').textContent = '正在准备旅程图片…';
  shareBlob = null; shareDialog.showModal();
  void makeShareImage().then(blob => { shareBlob = blob; $('share-feedback').textContent = blob ? '图片准备好了，可以分享或保存。' : '图片暂时无法生成，可以复制游戏链接。'; });
});
$('share-close').addEventListener('click', () => shareDialog.close());
shareDialog.addEventListener('click', event => { if (event.target === shareDialog) shareDialog.close(); });
$('share-action').addEventListener('click', async () => {
  const text = `我在《飞鸽传信》完成了第 ${game.level} 关「${game.config.name}」，得到 ${game.stars} 星、${Math.floor(game.score)} 分。来一起飞一程：${location.origin}`;
  try {
    if (shareBlob && navigator.canShare?.({ files: [new File([shareBlob], '云间来信.png', { type: 'image/png' })] })) {
      await navigator.share({ title: '飞鸽传信 · 云间来信', text, files: [new File([shareBlob], '云间来信.png', { type: 'image/png' })] });
      $('share-feedback').textContent = '旅程卡片已分享。'; return;
    }
    if (navigator.share) { await navigator.share({ title: '飞鸽传信 · 云间来信', text, url: location.origin }); $('share-feedback').textContent = '已分享。'; return; }
    await navigator.clipboard.writeText(text); $('share-feedback').textContent = '邀请文字与链接已复制，可以发给朋友。';
  } catch (error) { if (error?.name !== 'AbortError') $('share-feedback').textContent = '分享没有完成，请试试保存图片。'; }
});
$('share-download').addEventListener('click', async () => {
  const blob = shareBlob || await makeShareImage();
  if (!blob) { $('share-feedback').textContent = '图片暂时无法保存。'; return; }
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `云间来信-第${game.level}关.png`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  $('share-feedback').textContent = '旅程图片已保存。';
});

function openHelp() { if (game.state === 'playing') pause(); $('help-dialog').showModal(); }
$('help-button').addEventListener('click', openHelp);
$('help-close').addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) $('help-dialog').close(); });
$('help-tutorial').addEventListener('click', () => { $('help-dialog').close(); showTutorial(); });
$('tutorial-skip').addEventListener('click', () => closeTutorial(false));
$('tutorial-action').addEventListener('click', () => {
  if (tutorial.step === 0) flap(); else if (tutorial.step === 1) setTutorialStep(2); else closeTutorial(true);
});
document.querySelectorAll('.world-tab').forEach(button => button.addEventListener('click', () => {
  selectedWorld = Number(button.dataset.world); renderMap();
}));
game.selectLevel(Math.min(TOTAL_LEVELS, nextUnlocked()));
saveLocal(); renderMap(); showOverlay('ready');
if (signedIn) {
  saveBanner(account.dataset.storageReady === 'true' ? '账号进度已同步 · 完成关卡后自动保存' : '账号进度暂时无法读取，本机记录仍可继续玩');
  const existing = new Map(serverRecords.map(item => [item.id, item]));
  let expected = Number(account.dataset.nextLevel) || 1;
  for (const item of [...localRecords, ...guestRecords].sort((a, b) => a.id - b.id)) {
    if (!Number.isInteger(item.id) || item.id > expected) continue;
    const old = existing.get(item.id);
    if (!old || item.stars > old.stars || item.score > old.score) queueSave(item);
    if (item.id === expected) expected++;
  }
  saveQueue.then(() => { if (!failedSave) { try { localStorage.removeItem('pigeon-levels-v1'); } catch {} } });
  const serverDays = new Set(serverDailyRecords.map(record => record.day));
  for (const day of dailyHistory.filter(day => !serverDays.has(day))) queueDailySave(day, day === todayKey ? dailyLevel : 1, 0);
  try { localStorage.setItem(dailyStorageKey, JSON.stringify(dailyHistory)); localStorage.removeItem('pigeon-levels-v1-daily'); } catch {}
} else saveBanner('游客进度已存到本机 · 登录后可跨设备同步');
try { if (localStorage.getItem('pigeon-tutorial-seen-v4') !== '1') showTutorial(); } catch { showTutorial(); }
