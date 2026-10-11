import { LEVELS, TOTAL_LEVELS, starsFor } from './levels.mjs';
export const DESTINATION = 1000;
export const COURSES = [
  { title: '江南寄信', place: '水乡 · 晨光', role: '信鸽', item: '来信', objective: '送信', unit: '封', hazard: '风筝', pickup: '羽毛护盾', background: '/jiangnan.webp', stations: ['柳岸', '小桥', '远山', '晴川', '云间'], description: '收信、躲风筝，也留心影隼的俯冲。看见红色航线就变换高度，擦翼躲过还能得分。', stages: ['轻拍翅膀，熟悉江南的风', '金色来信双倍心意 · 三连可冲刺', '风筝开始移动 · 羽毛能挡一次碰撞', '河湾阵风来了 · 看准影隼的航线', '两只风筝交错 · 最后一站就在前方'] },
  { title: '山海听风', place: '山海 · 晚霞', role: '纸鹤', item: '风铃', objective: '唤醒风铃', unit: '串', hazard: '雷云', pickup: '上升气流', background: '/shanhai.svg', stations: ['青岚', '松间', '听泉', '峰回', '云海'], description: '化身纸鹤，收集山间风铃；穿过青色气流可获得短暂升力，雷云会左右飘移。', stages: ['纸鹤比信鸽更轻，跟着风铃飞', '三连风铃进入顺风滑翔', '青色气流提供升力 · 留意雷云', '峡谷风改向，轻拍维持高度', '两团雷云交错 · 借升力越过山巅'] },
  { title: '星河点灯', place: '星河 · 深夜', role: '萤灯', item: '星光', objective: '点亮星灯', unit: '簇', hazard: '流星', pickup: '星光护盾', background: '/xingye.svg', stations: ['渡月', '萤溪', '星桥', '银河', '星驿'], description: '化身萤灯，追逐星光，闪避流星。三连星光会点亮护盾，帮你穿过夜色。', stages: ['萤灯向上轻飘，先找到第一簇星光', '金色星光更亮 · 三连点亮护盾', '流星斜掠而过 · 收下蓝色星核', '夜风有节奏地变换方向', '星群和流星交错 · 点亮最后的星驿'] },
];
export class FlightEngine {
  constructor({ width = 1000, height = 520, random = Math.random, onEvent = () => {} } = {}) {
    this.width = width; this.height = height; this.random = random; this.onEvent = onEvent; this.level = 1; this.course = 1; this.reset();
  }
  reset() {
    this.config = LEVELS[this.level - 1]; this.course = this.config.world;
    this.state = 'ready'; this.distance = 0; this.elapsed = 0; this.hearts = 3;
    this.collected = 0; this.delivered = 0; this.invincible = 0; this.stage = 1; this.lastCheckpoint = 0;
    this.combo = 0; this.bestCombo = 0; this.shield = 0; this.boost = 0; this.updraft = 0; this.bonus = 0;
    this.nearMisses = 0; this.falcon = null;
    this.kites = []; this.letters = []; this.feathers = []; this.particles = [];
    this.bird = { x: this.width * .23, y: this.height * .4, vy: 0 };
    this.kiteTimer = this.course === 1 ? 2.8 : 2.5; this.letterTimer = .8; this.featherTimer = this.config.special === 'shield' || this.config.special === 'updraft' ? 2 : this.course > 1 ? 3.8 : 6;
    this.letterCount = 0; this.waveRemaining = 0; this.waveIndex = 0; this.waveY = .4;
    this.falconTimer = this.course === 1 && this.level >= 4 ? 8.5 : Infinity;
    this.onEvent({ type: 'reset' });
  }
  resize(width, height) {
    const sy = height / this.height, sx = width / this.width;
    this.bird.y *= sy; this.bird.vy *= sy; this.bird.x = width * .23;
    for (const e of [...this.kites, ...this.letters, ...this.feathers, ...this.particles]) { e.x *= sx; e.y *= sy; }
    if (this.falcon) { this.falcon.x *= sx; this.falcon.y *= sy; }
    this.width = width; this.height = height;
  }
  start() {
    if (this.state !== 'ready') this.reset();
    this.state = 'playing'; this.flap(); this.onEvent({ type: 'start' });
  }
  selectLevel(level) {
    if (!Number.isInteger(level) || level < 1 || level > TOTAL_LEVELS || this.state === 'playing') return false;
    this.level = level; this.reset();
    this.onEvent({ type: 'select', level, course: this.course }); return true;
  }
  retryLevel() {
    if (this.state !== 'lost') return false;
    this.reset(); this.start(); return true;
  }
  nextLevel() {
    if (this.state !== 'won') return false;
    this.level = this.level % TOTAL_LEVELS + 1; this.reset(); this.start(); return true;
  }
  flap() {
    if (this.state !== 'playing') return;
    this.bird.vy = -this.height * .55;
    this.particles.push({ x: this.bird.x - 12, y: this.bird.y + 12, life: .55 });
  }
  pause() {
    if (this.state === 'playing') { this.state = 'paused'; this.onEvent({ type: 'pause' }); }
    else if (this.state === 'paused') { this.state = 'playing'; this.onEvent({ type: 'resume' }); }
  }
  hit() {
    if (this.invincible > 0 || this.state !== 'playing') return;
    if (this.shield > 0) { this.shield = 0; this.invincible = 1.5; this.onEvent({ type: 'shield-block' }); return; }
    this.hearts -= 1; this.invincible = 1.7; this.combo = 0;
    this.onEvent({ type: 'hit', hearts: this.hearts });
    if (this.hearts === 0) { this.state = 'lost'; this.onEvent({ type: 'end', won: false, reason: 'hearts' }); }
  }
  collect(letter) {
    const value = letter.gold ? 2 : 1;
    this.collected += value; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.bonus += Math.max(0, this.combo - 1) * 5 * value;
    for (let i = 0; i < 6; i++) this.particles.push({ x: letter.x, y: letter.y, life: .65, dx: (this.random() - .5) * 100, dy: (this.random() - .5) * 100, gold: true });
    this.onEvent({ type: 'collect', total: this.collected, combo: this.combo, gold: Boolean(letter.gold) });
    if (this.combo % 3 === 0) {
      this.boost = 3.4; this.invincible = Math.max(this.invincible, 3.4);
      if (this.course === 3) this.shield = 1;
      this.onEvent({ type: 'boost', combo: this.combo });
    }
  }
  tick(delta) {
    if (this.state !== 'playing') return;
    const dt = Math.min(Math.max(delta, 0), .04);
    this.elapsed += dt;
    this.distance = Math.min(this.config.distance, this.distance + dt * (this.boost > 0 ? 29 : 20));
    this.invincible = Math.max(0, this.invincible - dt); this.boost = Math.max(0, this.boost - dt); this.updraft = Math.max(0, this.updraft - dt);
    const radius = this.radius, windStarts = this.course === 1 ? 4 : this.course === 2 ? 3 : 2;
    const wind = this.stage >= windStarts || this.config.special === 'crosswind' ? Math.sin(this.elapsed * (this.course === 3 ? 2.35 : 1.8)) * this.height * (.14 + this.course * .025) * this.config.wind : 0;
    const lift = this.course === 2 && this.updraft > 0 ? this.height * .93 : 0;
    this.bird.vy += (this.height * (this.course === 3 ? 1.36 : 1.5) + wind - lift) * dt;
    this.bird.y += this.bird.vy * dt;
    const ceiling = Math.max(82, this.height * .16) + radius;
    if (this.bird.y < ceiling) { this.bird.y = ceiling; this.bird.vy = Math.max(0, this.bird.vy); }
    if (this.bird.y > this.height * .86 - radius) { this.bird.y = this.height * .86 - radius; this.bird.vy = -this.height * .5; this.hit(); }
    if (this.state !== 'playing') return;
    const speed = Math.max(120, this.width * .20) * (1 + (this.course - 1) * .10 + (this.stage - 1) * .035) * this.config.danger * (this.boost > 0 ? 1.25 : 1);
    this.falconTimer -= dt;
    if (this.falconTimer <= 0 && !this.falcon && this.distance < this.config.distance - 95) {
      this.falcon = { phase: 'warning', timer: 1.6, x: this.width + 85, y: Math.max(ceiling + 25, Math.min(this.height * .72, this.bird.y)), closest: Infinity, hit: false, passed: false };
      this.falconTimer = 13 + this.random() * 4;
      this.onEvent({ type: 'falcon-warning' });
    }
    if (this.falcon) {
      const falcon = this.falcon;
      if (falcon.phase === 'warning') {
        falcon.timer -= dt;
        if (falcon.timer <= 0) { falcon.phase = 'swoop'; this.onEvent({ type: 'falcon-swoop' }); }
      } else {
        falcon.x -= Math.max(220, speed * 1.75) * dt;
        const gap = Math.hypot(falcon.x - this.bird.x, falcon.y - this.bird.y);
        falcon.closest = Math.min(falcon.closest, gap);
        if (!falcon.hit && gap < radius + 20) { falcon.hit = true; this.hit(); }
        if (!falcon.passed && falcon.x < this.bird.x - 42) {
          falcon.passed = true;
          if (!falcon.hit && falcon.closest < radius + 62) {
            this.nearMisses++; this.bonus += 45;
            this.onEvent({ type: 'near-miss', count: this.nearMisses });
          }
        }
        if (falcon.x < -110) this.falcon = null;
      }
    }
    if (this.state !== 'playing') return;
    this.kiteTimer -= dt; this.letterTimer -= dt;
    if (this.kiteTimer <= 0 && !this.falcon) {
      const minY = ceiling + radius + 27, maxY = this.height * .72 - radius;
      const y = minY + this.random() * Math.max(10, maxY - minY), moving = this.stage >= 3 || this.course > 1;
      this.kites.push({ x: this.width + 45, y, phase: this.random() * Math.PI * 2, amplitude: moving ? 26 + this.course * 5 : 8 });
      if (this.config.special === 'double' || this.config.special === 'finale' && this.stage >= 4) this.kites.push({ x: this.width + 155, y: y > this.height * .45 ? Math.max(ceiling + radius + 52, this.height * .31) : this.height * .68, phase: this.random() * 6, amplitude: 20 });
      this.kiteTimer = Math.max(1.8, (3.3 - this.stage * .13 - this.course * .07) / this.config.danger) + this.random() * .7;
    }
    if (this.letterTimer <= 0) {
      if (this.waveRemaining === 0) { this.waveY = .30 + this.random() * .29; this.waveRemaining = this.stage >= 2 ? 3 : 1; this.waveIndex = 0; }
      this.letterCount++;
      const flightOffset = this.config.flightLine[this.waveIndex++ % this.config.flightLine.length];
      this.letters.push({ x: this.width + 40, y: this.height * (this.waveY + flightOffset) + (this.random() - .5) * 12, phase: this.random() * 6, gold: (this.config.special === 'golden' ? this.letterCount % 3 === 0 : this.letterCount % 5 === 0) });
      this.waveRemaining--; this.letterTimer = this.waveRemaining > 0 ? .5 : 1.25 + this.random() * .45;
    }
    if (this.stage >= 3 || this.course > 1 || this.config.special === 'shield') {
      this.featherTimer -= dt;
      if (this.featherTimer <= 0) { this.feathers.push({ x: this.width + 40, y: this.height * (.30 + this.random() * .27), phase: this.random() * 6 }); this.featherTimer = 6.0 + this.random() * 1.5; }
    }
    for (const kite of this.kites) {
      kite.x -= speed * dt;
      const y = kite.y + Math.sin(this.elapsed * (this.course === 3 ? 2.65 : 2) + kite.phase) * (kite.amplitude ?? 12);
      if (Math.hypot(kite.x - this.bird.x, y - this.bird.y) < radius + 17) this.hit();
    }
    if (this.state !== 'playing') return;
    this.letters = this.letters.filter(letter => {
      letter.x -= speed * dt;
      const y = letter.y + Math.sin(this.elapsed * 2 + letter.phase) * 6;
      if (Math.hypot(letter.x - this.bird.x, y - this.bird.y) < radius + 24) { this.collect(letter); return false; }
      if (letter.x < -70) { this.combo = 0; return false; }
      return true;
    });
    this.feathers = this.feathers.filter(feather => {
      feather.x -= speed * dt;
      const y = feather.y + Math.sin(this.elapsed * 2 + feather.phase) * 9;
      if (Math.hypot(feather.x - this.bird.x, y - this.bird.y) < radius + 25) {
        if (this.course === 2) { this.updraft = 4; this.bird.vy = Math.min(this.bird.vy, -this.height * .28); this.bonus += 20; this.onEvent({ type: 'updraft-pickup' }); }
        else { if (this.shield) this.bonus += 30; this.shield = 1; this.onEvent({ type: 'shield-pickup' }); }
        return false;
      }
      return feather.x > -70;
    });
    this.kites = this.kites.filter(kite => kite.x > -90);
    this.particles = this.particles.filter(p => { p.life -= dt; p.x += (p.dx ?? -80) * dt; p.y += (p.dy ?? 0) * dt; return p.life > 0; });
    const station = Math.floor(this.distance / (this.config.distance / 5));
    if (station > this.delivered) { this.delivered = station; this.lastCheckpoint = station < 5 ? station : 0; this.stage = Math.min(5, station + 1); this.onEvent({ type: 'deliver', station }); this.onEvent({ type: 'stage', stage: this.stage }); }
    if (this.distance >= this.config.distance) {
      const won = this.collected >= this.config.goal;
      this.state = won ? 'won' : 'lost';
      this.onEvent({ type: 'end', won, reason: won ? 'complete' : 'goal', stars: won ? this.stars : 0 });
    }
  }
  get radius() { return Math.min(23, Math.max(16, this.width * .025)); }
  get score() { return this.delivered * 100 + this.collected * 30 + this.hearts * 50 + this.bonus; }
  get stars() { return starsFor(this.config, this.collected, this.hearts); }
  snapshot() { return { state: this.state, level: this.level, course: this.course, stage: this.stage, distance: Math.floor(this.distance), goal: this.config.goal, hearts: this.hearts, collected: this.collected, delivered: this.delivered, combo: this.combo, nearMisses: this.nearMisses, shield: this.shield, updraft: this.updraft, score: this.score, stars: this.stars }; }
}
