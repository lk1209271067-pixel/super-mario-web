// 渲染冒烟测试：用伪造的 Canvas 上下文把每个状态都画一遍，
// 以便在 Node 环境里捕获渲染路径上的运行时错误（未定义变量、错用 API 等）。
import test from 'node:test';
import assert from 'node:assert/strict';

function fakeContext() {
  const gradient = { addColorStop() {} };
  const target = { canvas: { width: 768, height: 448 } };
  return new Proxy(target, {
    get(t, key) {
      if (typeof key === 'symbol') return undefined;
      if (key in t) return t[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      if (key === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(t, key, value) {
      t[key] = value;
      return true;
    },
  });
}

globalThis.document = {
  createElement() {
    return { width: 0, height: 0, getContext: () => fakeContext() };
  },
};

const { initSprites } = await import('../js/sprites.js');
const { AdventureStage } = await import('../js/adventure.js');
const { Game } = await import('../js/game.js');

const input = {
  left: false, right: false, jump: false, jumpPressed: false,
  shoot: false, up: false, down: false, run: false, restartPressed: false,
  postUpdate() {},
};

function build() {
  initSprites();
  return new AdventureStage();
}

test('every adventure state renders without throwing', () => {
  const ctx = fakeContext();
  for (const state of ['intro', 'play', 'dying', 'cleared', 'gameover', 'ending']) {
    const stage = build();
    stage.state = state;
    stage.stateT = 40;
    stage.banner = { text: 'TEST', sub: 'SUB', t: 10, life: 60 };
    assert.doesNotThrow(() => stage.render(ctx), `state=${state} 渲染失败`);
  }
});

test('gameplay art renders with weapons, drops, boss and status effects on screen', () => {
  const ctx = fakeContext();
  const stage = build();
  stage.state = 'play';
  stage.boss.active = true;
  stage.player.board = true;
  stage.player.fairy = 60;
  stage.player.weapon = 'fire';
  stage.weapons.push({ kind: 'fire', x: 120, y: 200, vx: 6, vy: -1, w: 12, h: 12, life: 60, t: 5 });
  stage.weapons.push({ kind: 'axe', x: 160, y: 200, vx: 5, vy: -1, w: 12, h: 12, life: 60, t: 5 });
  stage.bossBullets.push({ x: 400, y: 200, vx: -1, vy: -1, w: 12, h: 12, life: 60 });
  for (const kind of ['axe', 'fire', 'milk', 'fairy', 'skateboard']) {
    stage.drops.push({ kind, x: 260, y: 300, w: 24, h: 24, vy: 0, t: 0, landed: true });
  }
  assert.doesNotThrow(() => stage.render(ctx));
});

test('the game shell boots into stage three and plays the stage two handover', () => {
  initSprites();
  const ctx = fakeContext();
  const game = new Game(ctx, input);

  game.startAdventure({ score: 1200, lives: 3 });
  assert.equal(game.mode, 'adventure');
  for (let i = 0; i < 5; i++) {
    game.update();
    assert.doesNotThrow(() => game.render());
  }

  game.startIslandTransition({ score: 1200, lives: 3 });
  assert.equal(game.mode, 'island');
  for (let i = 0; i < 4; i++) {
    game.update();
    assert.doesNotThrow(() => game.render());
  }
});
