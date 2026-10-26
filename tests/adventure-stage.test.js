import test from 'node:test';
import assert from 'node:assert/strict';
import { AdventureStage } from '../js/adventure.js';
import { STAGE, FLOOR, FRUITS } from '../js/adventureData.js';
import { ContraStage } from '../js/contra.js';
import { MAPS, validateMaps } from '../js/sprites.js';

const input = (o = {}) => ({
  left: false, right: false, jump: false, jumpPressed: false,
  shoot: false, up: false, down: false, run: false, restartPressed: false, ...o,
});

function playing() {
  const s = new AdventureStage();
  s.state = 'play';
  s.player.invuln = 0;
  return s;
}

test('stage three is a single Adventure Island level sized like the earlier stages', () => {
  assert.equal(STAGE.width, 4200, '单关长度应与前两关同一量级');
  assert.ok(STAGE.platforms.length >= 10);
  assert.ok(STAGE.enemies.length >= 8);
  assert.ok(STAGE.pits.length >= 3);
  assert.equal(STAGE.eggs.length, 5);
  const s = new AdventureStage();
  assert.equal(s.round, undefined, '不应再有多小关结构');
});

test('the wild-Mario sprite set is valid pixel data in the existing 16x14 grid', () => {
  assert.deepEqual(validateMaps(), []);
  for (const key of ['MARIO_WILD_STAND', 'MARIO_WILD_WALK', 'MARIO_WILD_JUMP']) {
    assert.equal(MAPS[key][0].length, 16);
    assert.equal(MAPS[key].length, 14);
  }
});

test('vitality drains continuously and fruit restores it', () => {
  const s = playing();
  const before = s.player.vital;
  for (let i = 0; i < 300; i++) s.update(input());
  assert.ok(s.player.vital < before, '体力槽应随时间衰减');

  const fruit = s.fruits.find((f) => f.alive);
  fruit.x = s.player.x;
  fruit.y = s.player.y;
  const low = s.player.vital;
  s.update(input());
  assert.ok(s.player.vital > low, '吃到水果应回复体力');
  assert.ok(s.score >= FRUITS[fruit.kind].points);
});

test('running out of vitality costs a life', () => {
  const s = playing();
  s.player.vital = 0.0005;
  const hp = s.hp;
  s.update(input());
  assert.equal(s.state, 'dying');
  for (let i = 0; i < 90; i++) s.update(input());
  assert.equal(s.hp, hp - 1);
  assert.equal(s.state, 'play');
  assert.ok(s.player.vital > 11.9, '复活后体力回满（原作规则）');
});

test('touching an enemy costs a life and strips the weapon', () => {
  const s = playing();
  s.player.weapon = 'axe';
  s.player.board = false;
  const hp = s.hp;
  const enemy = s.enemies[0];
  enemy.x = s.player.x;
  enemy.y = s.player.y;
  s.update(input());
  assert.equal(s.state, 'dying');
  for (let i = 0; i < 90; i++) s.update(input());
  assert.equal(s.hp, hp - 1);
  assert.equal(s.player.weapon, null, '死亡后失去武器');
});

test('a skateboard absorbs one hit instead of a life', () => {
  const s = playing();
  s.player.board = true;
  s.player.invuln = 0;
  const hp = s.hp;
  const enemy = s.enemies[0];
  enemy.x = s.player.x;
  enemy.y = s.player.y;
  s.update(input());
  assert.equal(s.hp, hp);
  assert.equal(s.player.board, false, '滑板被撞毁');
  assert.equal(s.state, 'play');
});

test('a fairy makes contact harmless and kills the enemy', () => {
  const s = playing();
  s.player.fairy = 300;
  const hp = s.hp;
  const enemy = s.enemies[0];
  enemy.x = s.player.x;
  enemy.y = s.player.y;
  s.update(input());
  assert.equal(s.hp, hp);
  assert.equal(enemy.alive, false);
});

test('stone axes are capped at two on screen', () => {
  const s = playing();
  s.player.weapon = 'axe';
  s.throwWeapon();
  s.throwWeapon();
  s.throwWeapon();
  assert.equal(s.weapons.length, 2);
});

test('an egg cracks on the first hit and yields its item on the second', () => {
  const s = playing();
  const egg = s.eggs[0];
  const hitWithAxe = () => s.weapons.push({ kind: 'axe', x: egg.x, y: egg.y, vx: 0, vy: 0, w: 12, h: 12, life: 60, t: 0 });
  hitWithAxe();
  s.updateWeapons();
  assert.equal(egg.cracked, 1);
  assert.equal(egg.alive, true);
  hitWithAxe();
  s.updateWeapons();
  assert.equal(egg.alive, false);
  assert.equal(s.drops.length, 1);
  assert.equal(s.drops[0].kind, egg.content);
});

test('milk refills the whole vitality meter', () => {
  const s = playing();
  s.player.vital = 1;
  s.applyItem('milk');
  assert.equal(s.player.vital, 12);
});

test('checkpoints record the respawn position', () => {
  const s = playing();
  const cp = s.checkpoints[0];
  s.player.x = cp.x;
  s.player.y = cp.y;
  s.update(input());
  assert.equal(cp.taken, true);
  assert.equal(s.checkpointX, cp.x);
});

test('falling into water is instant death', () => {
  const s = playing();
  s.player.y = 600;
  s.update(input());
  assert.equal(s.state, 'dying');
});

test('the goal is locked until the witch doctor dies', () => {
  const s = playing();
  assert.equal(s.goalOpen, false);
  s.player.x = s.goalX;
  s.update(input());
  assert.notEqual(s.state, 'cleared');

  s.boss.active = true;
  s.boss.hp = 1;
  s.damageBoss(1);
  assert.equal(s.boss.dead, true);
  assert.equal(s.goalOpen, true);

  s.player.x = s.goalX;
  s.update(input());
  assert.equal(s.state, 'cleared');
});

test('clearing the stage shows the clear screen then the ending', () => {
  const s = playing();
  s.goalOpen = true;
  s.player.x = s.goalX;
  s.update(input());
  assert.equal(s.state, 'cleared');
  for (let i = 0; i < 100; i++) s.update(input());
  assert.equal(s.state, 'ending');
});

test('stage two hands over to stage three when Mario walks into the opened gate', () => {  const stage = new ContraStage();
  stage.boss.hp = 1;
  stage.damageBoss(1);
  assert.equal(stage.thirdLevelEntrance.open, true);
  assert.equal(stage.exitReady, false);

  stage.player.x = stage.thirdLevelEntrance.x;
  stage.player.y = stage.thirdLevelEntrance.y + 10;
  stage.update(input());
  assert.equal(stage.exitReady, true);
});

test('a closed gate cannot be entered', () => {
  const stage = new ContraStage();
  stage.state = 'play';
  stage.player.x = stage.thirdLevelEntrance.x;
  stage.player.y = stage.thirdLevelEntrance.y + 10;
  stage.update(input());
  assert.equal(stage.exitReady, false);
});

// ---------------- 手感与难度标定（防止后续调参破坏公平性） ----------------

function measureJump() {
  const s = new AdventureStage({ godMode: true });
  s.state = 'play';
  s.player.x = 60;
  for (let i = 0; i < 60; i++) s.update(input({ right: true }));
  const x0 = s.player.x;
  const y0 = s.player.y;
  let apex = 0;
  for (let i = 0; i < 200; i++) {
    s.update(input({ right: true, jump: true, jumpPressed: i === 0 }));
    apex = Math.max(apex, y0 - s.player.y);
    if (i > 3 && s.player.onGround) break;
  }
  return { width: s.player.x - x0, apex };
}

test('a held jump clears every water gap with a comfortable margin', () => {
  const { width, apex } = measureJump();
  assert.ok(width > 110, `跳跃水平射程 ${width.toFixed(1)}px 过短`);
  assert.ok(apex > 100, `跳跃高度 ${apex.toFixed(1)}px 过低`);
  for (const pit of STAGE.pits) {
    const margin = width - pit.w;
    assert.ok(margin >= 24, `水沟 x=${pit.x} 宽 ${pit.w}px 仅剩 ${margin.toFixed(1)}px 余量，容错过低`);
  }
});

test('every water gap has enough flat runway before it to build up speed', () => {
  for (const pit of STAGE.pits) {
    const blocking = STAGE.platforms.filter((q) => q.x + q.w > pit.x - 110 && q.x < pit.x + pit.w);
    assert.equal(blocking.length, 0, `水沟 x=${pit.x} 前 110px 内有平台，落地即入水`);
  }
});

test('the vitality meter empties in roughly 40 seconds of play', () => {
  const s = new AdventureStage();
  s.state = 'play';
  s.fruits.forEach((f) => { f.alive = false; });
  s.eggs.forEach((e) => { e.alive = false; });
  s.enemies.forEach((e) => { e.alive = false; });
  let frames = 0;
  while (s.state === 'play' && frames < 4000) {
    s.update(input());
    frames++;
  }
  const seconds = frames / 60;
  assert.ok(seconds > 36 && seconds < 46, `满槽续航 ${seconds.toFixed(1)}s 偏离 40s 标定，饥饿压力会失衡`);
});

test('coyote time lets Mario jump shortly after running off a ledge', () => {
  const s = new AdventureStage();
  s.state = 'play';
  const plat = s.platforms[0];
  s.player.x = plat.x + plat.w - s.player.w - 2;
  s.player.y = plat.y - s.player.h;
  s.player.onGround = true;
  let guard = 0;
  while (s.player.onGround && guard < 40) {
    s.update(input({ right: true }));
    guard++;
  }
  assert.equal(s.player.onGround, false, '应已离开平台');
  assert.ok(s.player.coyote > 0, '离开边缘后应仍有土狼时间');
  s.update(input({ jumpPressed: true, jump: true }));
  assert.ok(s.player.vy < 0, '离开边缘后 6 帧内仍应能起跳');
});

test('jump buffering allows a jump pressed just before landing', () => {
  const s = new AdventureStage();
  s.state = 'play';
  s.player.x = 200;
  s.player.y = 300;
  s.player.vy = 6;
  s.player.onGround = false;
  s.player.jumpBuffer = 6;
  let landed = false;
  for (let i = 0; i < 40 && !landed; i++) {
    s.update(input());
    if (s.player.onGround) landed = true;
  }
  assert.equal(landed, true);
});

