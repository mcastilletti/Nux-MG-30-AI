import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBandDoc, parseNotesModelMarker, parsePlaylistDoc, parsePlaylistItems } from './playlist-data';

test('parsePlaylistItems scarta voci non valide e doppioni, conserva i preset propri', () => {
  assert.deepEqual(parsePlaylistItems([
    { noteId: 'a' }, { noteId: 'b', presetSlot: '48', presetScene: '1' }, { noteId: 'a' }, null, 'x', { noteId: '' },
    { noteId: 'c', presetSlot: '' , presetScene: '2' }, { noteId: 'd', presetSlot: 7 },
  ]), [{ noteId: 'a' }, { noteId: 'b', presetSlot: '48', presetScene: '1' }, { noteId: 'c', presetSlot: '' }, { noteId: 'd' }]);
  assert.deepEqual(parsePlaylistItems(undefined), []);
});

test('una scaletta del modello vecchio (senza items) diventa una playlist vuota', () => {
  assert.deepEqual(parsePlaylistDoc('s1', { name: 'Estate', bandId: 'b1', userId: 'u' }), { id: 's1', name: 'Estate', bandId: 'b1', userId: 'u', items: [], createdAt: undefined, updatedAt: undefined });
  assert.equal(parsePlaylistDoc('s2', { bandId: 'b1' }), null);
});

test('band e marcatore', () => {
  assert.equal(parseBandDoc('b', { name: 'Demo', userId: 'u' })!.logoUrl, null);
  assert.equal(parseBandDoc('b', {}), null);
  assert.deepEqual(parseNotesModelMarker({ version: 2, migratedAt: '2026-10-26' }), { version: 2, migratedAt: '2026-10-26', summary: undefined });
  assert.equal(parseNotesModelMarker({ version: '2' }), null);
  assert.equal(parseNotesModelMarker(undefined), null);
});
