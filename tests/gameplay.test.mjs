import test from 'node:test';
import assert from 'node:assert/strict';
import { FlightEngine } from '../public/engine.mjs';
import { LEVELS, TOTAL_LEVELS } from '../public/levels.mjs';
import { createDoubleTapDetector } from '../public/input.mjs';

test('the first space never counts as a double tap, even immediately after opening', () => {
  const taps = createDoubleTapDetector();
  assert.equal(taps.tap(35), false);
  assert.equal(taps.tap(280), true);
  assert.equal(taps.tap(510), false);
  assert.equal(taps.tap(820), false);
  taps.reset();
  assert.equal(taps.tap(830), false);
  assert.equal(taps.tap(1120), true);
});

test('pause freezes the flight; damage, shield and retry obey their states', () => {
  const game = new FlightEngine({ random: () => .5 });
  game.start();
  game.tick(.02);
  game.pause();
  const frozen = game.snapshot();
  for (let i = 0; i < 300; i++) game.tick(.04);
  assert.deepEqual(game.snapshot(), frozen);
  game.pause();
  assert.equal(game.state, 'playing');
  game.shield = 1;
  game.hit();
  assert.equal(game.hearts, 3);
  assert.equal(game.shield, 0);
  for (let i = 0; i < 3; i++) { game.invincible = 0; game.hit(); }
  assert.equal(game.state, 'lost');
  assert.equal(game.retryLevel(), true);
  assert.equal(game.hearts, 3);
  assert.equal(game.state, 'playing');
});

test('special missions change the opening wave and moving obstacle', () => {
  const combo = new FlightEngine({ random: () => .5 });
  combo.selectLevel(6);
  combo.start();
  while (combo.elapsed < .9) { combo.bird.y = 260; combo.bird.vy = 0; combo.tick(.02); }
  assert.equal(combo.stage, 1);
  assert.equal(combo.waveRemaining, 2, 'combo starts with a three-item wave');

  const moving = new FlightEngine({ random: () => .5 });
  moving.selectLevel(4);
  moving.start();
  moving.invincible = 100;
  while (!moving.kites.length) { moving.bird.y = 260; moving.bird.vy = 0; moving.tick(.02); }
  assert.equal(moving.stage, 1);
  assert.ok(moving.kites[0].amplitude >= 50, 'moving hazard is distinct from a calm opening');
});

test('all 30 missions initialize and render finite flight coordinates on phone and desktop', () => {
  assert.equal(TOTAL_LEVELS, 30);
  assert.equal(new Set(LEVELS.map(level => level.scene)).size, 30);
  for (const [width, height] of [[360, 500], [1000, 520]]) {
    for (const level of LEVELS) {
      const game = new FlightEngine({ width, height, random: () => .5 });
      assert.equal(game.selectLevel(level.id), true);
      game.start();
      game.invincible = 100;
      for (let i = 0; i < 160; i++) {
        game.bird.y = height * .45;
        game.bird.vy = 0;
        game.tick(.04);
      }
      assert.equal(game.state, 'playing', `level ${level.id} at ${width}px`);
      assert.ok(game.letters.length > 0, `level ${level.id} offers collectibles`);
      assert.ok(game.kites.length > 0, `level ${level.id} has hazards`);
      for (const item of [...game.kites, ...game.letters, ...game.feathers]) {
        assert.ok(Number.isFinite(item.x) && Number.isFinite(item.y), `level ${level.id} has finite positions`);
      }
    }
  }
});

test('collecting enough wins; reaching the goal without collecting fails', () => {
  for (const level of LEVELS) {
    const game = new FlightEngine({ random: () => .5 });
    game.selectLevel(level.id);
    game.start();
    game.invincible = 100;
    for (let i = 0; i < level.goal; i++) game.collect({ x: 100, y: 200, gold: false });
    while (game.state === 'playing') {
      game.bird.y = 260;
      game.bird.vy = 0;
      game.tick(.04);
    }
    assert.equal(game.state, 'won', `level ${level.id} can be completed`);
    assert.ok(game.stars >= 1);
  }
  const missed = new FlightEngine({ random: () => .5 });
  missed.start();
  missed.invincible = 100;
  while (missed.state === 'playing') {
    missed.letters = [];
    missed.bird.y = 260;
    missed.bird.vy = 0;
    missed.tick(.04);
  }
  assert.equal(missed.state, 'lost');
});
