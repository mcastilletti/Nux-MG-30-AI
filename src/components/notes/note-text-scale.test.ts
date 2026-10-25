import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTextScale, parseTextScale, stepTextScale } from './note-text-scale';

test('valori non validi tornano al 100%', () => {
  assert.equal(parseTextScale(null), 1);
  assert.equal(parseTextScale('abc'), 1);
  assert.equal(parseTextScale('2'), 1);
  assert.equal(parseTextScale('1.3'), 1.3);
});

test('A+ e A− si fermano agli estremi', () => {
  assert.equal(stepTextScale(1, 1), 1.15);
  assert.equal(stepTextScale(1.5, 1), 1.5);
  assert.equal(stepTextScale(1, -1), 0.9);
  assert.equal(stepTextScale(0.9, -1), 0.9);
  assert.equal(formatTextScale(1.15), '115%');
});
