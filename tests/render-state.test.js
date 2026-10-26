import test from 'node:test';
import assert from 'node:assert/strict';
import { Goomba } from '../js/enemies.js';
import { SPRITES } from '../js/sprites.js';

function makeContext() {
  let depth = 0;
  return {
    save() { depth++; },
    restore() { depth--; },
    translate() {},
    rotate() {},
    drawImage() {},
    scale() {},
    get depth() { return depth; },
  };
}

SPRITES.goombaA = { width: 32, height: 30 };
SPRITES.goombaB = { width: 32, height: 30 };
SPRITES.goombaSquash = { width: 32, height: 16 };

test('Goomba normal rendering preserves the canvas state stack', () => {
  const ctx = makeContext();
  const goomba = new Goomba(1, 1);

  goomba.render(ctx, 0);

  assert.equal(ctx.depth, 0, 'normal rendering must balance save() and restore()');
});

test('Goomba flipped rendering preserves the canvas state stack', () => {
  const ctx = makeContext();
  const goomba = new Goomba(1, 1);
  goomba.state = 'flip';

  goomba.render(ctx, 0);

  assert.equal(ctx.depth, 0, 'flipped rendering must balance save() and restore()');
});
