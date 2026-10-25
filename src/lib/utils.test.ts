import assert from 'node:assert/strict';
import test from 'node:test';

import { cn } from './utils';

test('cn conserva dimensione personalizzata e colore insieme', () => {
  assert.equal(cn('text-label', 'text-primary'), 'text-label text-primary');
  assert.equal(cn('text-caption text-muted-foreground', 'text-primary'), 'text-caption text-primary');
  // due dimensioni: vince l'ultima
  assert.equal(cn('text-label', 'text-caption'), 'text-caption');
  assert.equal(cn('text-sm', 'text-label'), 'text-label');
});
