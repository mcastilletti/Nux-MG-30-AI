import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { IconButton } from './icon-button';
import { ConnectionStatus } from './connection-status';
import { getConnectionStatusView } from './connection-status-view';
import { getSaveStatusLabel } from './save-status-label';
import { SaveStatus } from './save-status';
import { EmptyState, ErrorState } from './empty-state';

test('IconButton: nome accessibile e area di tocco 44px', () => {
  const html = renderToStaticMarkup(<IconButton label="Elimina chitarra">x</IconButton>);
  assert.match(html, /aria-label="Elimina chitarra"/);
  assert.match(html, /title="Elimina chitarra"/);
  assert.match(html, /h-11/);
  assert.match(html, /w-11/);
});

test('ConnectionStatus: testi per ogni stato, errore spiegato', () => {
  assert.equal(getConnectionStatusView('connected').label, 'MG-30 collegata');
  assert.equal(getConnectionStatusView('connecting').tone, 'warning');
  assert.equal(getConnectionStatusView('disconnected').tone, 'muted');
  assert.equal(getConnectionStatusView('qualsiasi').label, 'MG-30 non collegata');
  const err = getConnectionStatusView('error', 'Web MIDI API non supportata');
  assert.equal(err.tone, 'destructive');
  assert.match(err.detail, /Web MIDI API non supportata/);
  const html = renderToStaticMarkup(<ConnectionStatus status="error" lastError="Errore accesso MIDI" />);
  assert.match(html, /role="status"/);
  assert.match(html, /Errore accesso MIDI/);
});

test('SaveStatus: annunciato e con testo per ogni stato', () => {
  assert.equal(getSaveStatusLabel('idle'), null);
  assert.equal(getSaveStatusLabel('saving'), 'Salvataggio…');
  const html = renderToStaticMarkup(<SaveStatus state="error" />);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Salvataggio non riuscito/);
});

test('EmptyState ed ErrorState: titolo come heading, icona nascosta', () => {
  const html = renderToStaticMarkup(<EmptyState icon={<svg />} title="Nessun brano" description="Aggiungi un brano" />);
  assert.match(html, /<h3[^>]*>Nessun brano<\/h3>/);
  assert.match(html, /aria-hidden="true"/);
  const err = renderToStaticMarkup(<ErrorState onRetry={() => {}} />);
  assert.match(err, /Riprova/);
});
