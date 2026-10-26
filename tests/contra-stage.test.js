import test from 'node:test';
import assert from 'node:assert/strict';
import { ContraStage } from '../js/contra.js';

function input(overrides = {}) {
  return { left:false, right:false, jump:false, jumpPressed:false, shoot:false, up:false, down:false, run:false, ...overrides };
}

test('Contra stage includes a classic jungle route, mixed enemies, pickups, and final boss', () => {
  const stage = new ContraStage();
  assert.ok(stage.worldWidth >= 5000);
  assert.ok(stage.platforms.length >= 12);
  assert.ok(stage.enemies.some((e) => e.kind === 'runner'));
  assert.ok(stage.enemies.some((e) => e.kind === 'turret'));
  assert.ok(stage.enemies.some((e) => e.kind === 'sniper'));
  assert.ok(stage.pickups.some((p) => p.weapon === 'spread'));
  assert.equal(stage.boss.kind, 'green-cap-commando');
  assert.ok(stage.boss.hp >= 40);
});

test('stage two continues with the same Mario carrying a pistol and first-stage progress', () => {
  const stage = new ContraStage({ score: 2400, lives: 2, big: true, continuous: true });
  assert.equal(stage.player.identity, 'mario');
  assert.equal(stage.player.weapon, 'pistol');
  assert.equal(stage.score, 2400);
  assert.equal(stage.player.hp, 2);
  assert.equal(stage.state, 'arrival');
  assert.equal(stage.player.y, 92, 'Mario should enter stage two at the same on-screen height as the flight handoff');
});

test('player can fire, jump, aim, and collect a spread weapon', () => {
  const stage = new ContraStage();
  stage.state = 'play';
  stage.player.onGround = true;
  stage.update(input({ shoot:true, up:true, jumpPressed:true }));
  assert.ok(stage.player.vy < 0);
  assert.ok(stage.bullets.length > 0);
  assert.ok(stage.bullets[0].vy < 0);

  const pickup = stage.pickups.find((p) => p.weapon === 'spread');
  stage.player.x = pickup.x;
  stage.player.y = pickup.y;
  stage.update(input());
  assert.equal(stage.player.weapon, 'spread');
});

test('defeating the boss opens the third-level entrance placeholder', () => {
  const stage = new ContraStage();
  stage.boss.active = true;
  stage.boss.hp = 1;
  stage.damageBoss(1);
  assert.equal(stage.boss.dead, true);
  assert.equal(stage.thirdLevelEntrance.open, true);
  assert.equal(stage.state, 'mission-complete');
});

test('holding Shift produces a clearly faster running speed', () => {
  const walking = new ContraStage(); walking.state = 'play';
  const running = new ContraStage(); running.state = 'play';
  for (let i = 0; i < 30; i++) {
    walking.update(input({ right:true }));
    running.update(input({ right:true, run:true }));
  }
  assert.ok(running.player.vx >= walking.player.vx * 1.35);
});

test('Mario can crouch and fire low while standing on the ground', () => {
  const stage = new ContraStage(); stage.state = 'play'; stage.player.onGround = true;
  stage.update(input({ down:true, shoot:true }));
  assert.equal(stage.player.crouching, true);
  assert.ok(stage.bullets[0].y > stage.player.y + 20);
});

test('the raised machine-gun platform is reachable without requiring Shift', () => {
  const stage = new ContraStage();
  const takeoff = stage.platforms.find((p) => p.x === 1770);
  const landing = stage.platforms.find((p) => p.x === 2020 && p.y === 220);
  const horizontalGap = landing.x - (takeoff.x + takeoff.w);
  assert.ok(horizontalGap <= 125, `platform gap ${horizontalGap}px exceeds the normal-jump reach`);
});

test('Mario can double jump but cannot jump a third time before landing', () => {
  const stage = new ContraStage(); stage.state = 'play'; stage.player.onGround = true;
  stage.update(input({ jumpPressed:true }));
  const first = stage.player.vy;
  stage.update(input());
  stage.update(input({ jumpPressed:true }));
  const second = stage.player.vy;
  stage.update(input({ jumpPressed:true }));
  assert.ok(first < 0 && second < 0);
  assert.equal(stage.player.jumpsUsed, 2);
});

test('shooting a hidden wall cache reveals its weapon reward', () => {
  const stage = new ContraStage();
  const cache = stage.caches[0];
  cache.hp = 1;
  stage.damageCache(cache, 1);
  assert.equal(cache.broken, true);
  assert.ok(stage.pickups.some((p) => p.fromCache === cache.id && p.alive));
});

test('stage has flying capsules, water cover, explosive bridge, and reinforcements', () => {
  const stage = new ContraStage();
  assert.ok(stage.capsules.length >= 2);
  assert.ok(stage.waterZones.length >= 1);
  assert.ok(stage.bridge && stage.bridge.segments.length >= 5);
  assert.ok(stage.spawners.length >= 3);
});

test('the boss arena does not strand Mario at the old world boundary', () => {
  const stage = new ContraStage();
  assert.ok(stage.worldWidth >= 6200);
  assert.ok(stage.thirdLevelEntrance.x < stage.worldWidth - stage.thirdLevelEntrance.w);
  assert.ok(stage.worldWidth - (stage.boss.x + stage.boss.w) >= 450);
});

test('laser pierces targets while flame has a visibly curved trajectory', () => {
  const laser = new ContraStage(); laser.state='play'; laser.player.weapon='laser';
  laser.update(input({shoot:true,right:true}));
  assert.ok(laser.bullets[0].pierce >= 3);
  assert.ok(laser.bullets[0].w >= 18);

  const flame = new ContraStage(); flame.state='play'; flame.player.weapon='flame';
  flame.update(input({shoot:true,right:true}));
  assert.equal(flame.bullets[0].kind, 'flame');
  assert.notEqual(flame.bullets[0].wave, 0);
});

test('final boss is the green-cap muscle commando with multiple phases', () => {
  const stage = new ContraStage();
  assert.equal(stage.boss.kind, 'green-cap-commando');
  assert.ok(stage.boss.maxHp >= 60);
  assert.ok(stage.boss.phases >= 3);
});

test('Mario can keep moving toward stage three after defeating the boss', () => {
  const stage = new ContraStage();
  stage.boss.hp = 1;
  stage.damageBoss(1);
  const startX = stage.player.x;
  for (let i = 0; i < 20; i++) stage.update(input({ right:true }));
  assert.ok(stage.player.x > startX, 'post-boss state must not freeze movement input');
});
