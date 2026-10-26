import test from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_KEYMAP } from '../js/input.js';

test('C is the shooting key', () => {
  assert.equal(INPUT_KEYMAP.KeyC, 'shoot');
  assert.notEqual(INPUT_KEYMAP.KeyJ, 'shoot');
  assert.notEqual(INPUT_KEYMAP.KeyK, 'shoot');
});
