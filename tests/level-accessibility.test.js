import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel1 } from '../js/level.js';
import { GRAVITY, JUMP_SPEED, TILE } from '../js/config.js';

function simulatedJumpRise(initialSpeed = JUMP_SPEED) {
  let y = 0;
  let vy = -initialSpeed;
  while (vy < 0) {
    vy += GRAVITY;
    y += vy;
  }
  return -y;
}

test('the isolated mid-level brick corridor is reachable from the ground', () => {
  const level = buildLevel1();
  const corridorColumns = [94, 95, 96, 97, 98, 99];
  const blockRow = level.tiles.findIndex((row) => corridorColumns.every((tx) => row[tx] !== '.'));
  const groundTop = 12 * TILE;
  const smallPlayerHeight = 27;
  const playerHeadY = groundTop - smallPlayerHeight;
  const blockUndersideY = (blockRow + 1) * TILE;
  const requiredHeadRise = playerHeadY - blockUndersideY;

  assert.ok(
    requiredHeadRise <= simulatedJumpRise(),
    `corridor needs ${requiredHeadRise.toFixed(1)}px head rise, jump only reaches ${simulatedJumpRise().toFixed(1)}px`,
  );
});
