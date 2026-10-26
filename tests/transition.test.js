import test from 'node:test';
import assert from 'node:assert/strict';
import { Transition } from '../js/transition.js';

const input = { left:false, right:false, jump:false, jumpPressed:false, shoot:false, up:false, down:false };

test('flight transition continuously moves the camera upward before handing off', () => {
  const t = new Transition({ score: 500, lives: 3, big: false });
  const startCameraY = t.cameraY;
  for (let i = 0; i < 80; i++) t.update(input);
  assert.ok(t.cameraY < startCameraY - 100);
  assert.equal(t.done, false);
});

test('Mario draws his pistol during the flight before stage two begins', () => {
  const t = new Transition({ score: 500, lives: 3, big: false });
  for (let i = 0; i < 60; i++) t.update(input);
  assert.equal(t.hasPistol, true);
  while (!t.done) t.update(input);
  assert.equal(t.handoff.playerScreenY, 92);
  assert.equal(t.handoff.score, 500);
});
