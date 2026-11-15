import assert from 'node:assert/strict';
import test from 'node:test';

import { aiSongToNote, aiToneToArchivedSound, cleanChord, type AiSongData } from './ai-song';
import { parseArchivedSound } from './sound-archive';

const song = (over: Partial<AiSongData> = {}): AiSongData => ({
  title: 'Wonderwall - Oasis',
  genre: 'Britpop',
  generalNotes: 'Capotasto 2, 87 BPM.',
  sections: [{ type: 'Intro', text: 'Arpeggio.', chords: ['Em7', 'G', 'Dsus4', 'A7sus4', 'NEWLINE', 'x2'] }],
  tone: { name: 'Britpop pulito', explanation: 'Vox pulito.', effects: [{ type: 'amp', model: 'classa30', enabled: true, parameters: [{ name: 'gain', value: 30 }, { name: 'master', value: 500 }] }] },
  ...over,
});

test('accordi: forme riconosciute, a capo e ripetizioni; il resto viene scartato', () => {
  for (const ok of ['C', 'F#m', 'Bb', 'D/F#', 'Cmaj7', 'D5', 'NEWLINE', 'newline', 'x2', 'X4']) assert.ok(cleanChord(ok), ok);
  for (const bad of ['', 'hello', 'H', 'Cx', 'x9', 'Em7b5#11', 42, null]) assert.equal(cleanChord(bad as never), null, String(bad));
  assert.equal(cleanChord('newline'), 'NEWLINE');
  assert.equal(cleanChord('X4'), 'x4');
});

test('brano: sezioni con id, tipo valido, accordi ripuliti e note con il suono', () => {
  const note = aiSongToNote(song({ sections: [
    { type: 'Outro', text: 'x'.repeat(400), chords: ['x2', 'C', 'NEWLINE', 'NEWLINE', 'G', 'blah', 'x3', 'NEWLINE'] },
    { type: 'Verse', text: 'Ok', chords: ['Am'] },
  ] }), { toneName: 'Britpop pulito', idSeed: 7 });
  assert.deepEqual(note.sections.map((s) => s.id), ['section-7-0', 'section-7-1']);
  assert.equal(note.sections[0].type, 'Verse', 'tipo fuori elenco → Verse');
  assert.equal(note.sections[0].text.length, 300);
  assert.deepEqual(note.sections[0].chords, ['C', 'NEWLINE', 'G', 'x3']);
  assert.equal(note.droppedChords, 1);
  assert.equal(note.genre, 'Britpop');
  assert.match(note.generalNotes, /Capotasto 2/);
  assert.match(note.generalNotes, /«Britpop pulito»/);
});

test('genere fuori lista → vuoto; titolo vuoto → segnaposto', () => {
  const note = aiSongToNote(song({ genre: 'Vaporwave', title: '  ' }));
  assert.equal(note.genre, '');
  assert.equal(note.title, 'Brano senza titolo');
});

test('suono AI → suono dell\'Archivio valido, valori riportati nel range', () => {
  const { sound, warnings } = aiToneToArchivedSound(song().tone, { now: new Date('2026-01-01T00:00:00Z') });
  assert.equal(sound.name, 'Britpop pulito');
  assert.equal(sound.source, 'ai');
  assert.ok(parseArchivedSound(JSON.parse(JSON.stringify(sound))), 'si rilegge dopo il salvataggio');
  assert.ok(warnings.some((w) => /master/.test(w)), 'master 500 corretto: ' + warnings.join('|'));
});
