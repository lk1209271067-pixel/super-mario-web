import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../js/camera.js';
import { GRAVITY, JUMP_SPEED, TILE, VIEW_W } from '../js/config.js';

function simulatedJumpRise() {
  let y = 0;
  let vy = -JUMP_SPEED;
  while (vy < 0) {
    vy += GRAVITY;
    y += vy;
  }
  return -y;
}

test('normal jump clears a four-tile pipe with a safety margin', () => {
  assert.ok(
    simulatedJumpRise() >= 4 * TILE + 4,
    `jump rise ${simulatedJumpRise().toFixed(1)}px must clear a ${4 * TILE}px pipe`,
  );
});

test('camera follows the player back to the left', () => {
  const camera = new Camera();
  camera.x = 500;
  const player = { x: 500 + VIEW_W * 0.2, w: 20 };

  camera.update(player, 212 * TILE);

  assert.ok(camera.x < 500, `camera should move left, got ${camera.x}`);
});
