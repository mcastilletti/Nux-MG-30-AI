'use client';

import { useCallback, useState } from 'react';
import { useMidiStore } from '@/stores/use-midi-store';
import { getPresetSendCommands } from '@/components/notes/preset-send';

/**
 * Invio del preset collegato a una nota (D2), condiviso da foglio e Live.
 * `sent` alimenta l'etichetta del preset (L4): l'invio non è mai silenzioso.
 */
export function useNotePresetSender() {
  const status = useMidiStore((s) => s.status);
  const sendProgramChange = useMidiStore((s) => s.sendProgramChange);
  const sendSceneChange = useMidiStore((s) => s.sendSceneChange);
  const [sent, setSent] = useState(false);

  const send = useCallback((presetSlot?: string, presetScene?: string) => {
    const commands = getPresetSendCommands({ presetSlot, presetScene });
    if (!commands || status !== 'connected') return false;
    sendProgramChange(commands.program);
    if (commands.scene !== null) {
      const scene = commands.scene;
      setTimeout(() => sendSceneChange(scene), 500);
    }
    setSent(true);
    return true;
  }, [status, sendProgramChange, sendSceneChange]);

  const resetSent = useCallback(() => setSent(false), []);

  return { send, sent, resetSent, connected: status === 'connected' };
}
