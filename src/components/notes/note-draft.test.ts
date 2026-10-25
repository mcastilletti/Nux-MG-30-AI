import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeDraft } from './note-draft';

const draft = {
  title: 'Wonderwall',
  band: 'Demo Band',
  setlist: 'Live 2026',
  generalNotes: 'Capo 2',
  sections: [{ id: 's1', type: 'Verse', text: 'Today', chords: ['Em7', 'G'] }],
};

test('an unchanged draft serializes identically', () => {
  assert.equal(serializeDraft(draft), serializeDraft(structuredClone(draft)));
});

test('removing a chord makes the draft dirty', () => {
  const edited = structuredClone(draft);
  edited.sections[0].chords = ['Em7'];
  assert.notEqual(serializeDraft(edited), serializeDraft(draft));
});

test('key order does not create false changes', () => {
  const reordered = { sections: draft.sections, generalNotes: 'Capo 2', setlist: 'Live 2026', band: 'Demo Band', title: 'Wonderwall' };
  assert.equal(serializeDraft(reordered), serializeDraft(draft));
});
