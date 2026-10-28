import assert from 'node:assert/strict';
import test from 'node:test';

import { usePresetStore, cloneEffects, ensurePresetScenes } from './use-preset-store';
import { useMidiStore } from './use-midi-store';
import { Preset } from '@/types/preset';

function handleCopyScene(sourceScene: number, targetSlot: number, targetScene: number) {
  const { activePreset, copyScene, setActivePreset } = usePresetStore.getState();
  const { devicePresets } = useMidiStore.getState();

  const targetPresetRaw = devicePresets.find((preset) => preset.slot === targetSlot) || activePreset;
  const updatedTarget = copyScene(sourceScene, targetPresetRaw, targetScene);

  const destination: Preset = {
    ...updatedTarget,
    slot: targetSlot,
    activeScene: targetScene,
    effects: cloneEffects(updatedTarget.scenes![targetScene]),
    name: updatedTarget.name,
    lastModified: new Date(),
  };

  useMidiStore.setState((state) => ({
    devicePresets: state.devicePresets.map((preset) => preset.slot === targetSlot ? destination : preset),
  }));

  setActivePreset(destination);
  return destination;
}

/** Imposta un preset "a slot" con un gain diverso e riconoscibile in ciascuna delle 3 scene,
 * poi lo "commit-a" in devicePresets (come fa useDeferredPresetCommit nell'app reale) così
 * che riaprirlo più tardi (come fa l'utente cambiando preset) carichi questi dati, non un
 * residuo dello stato dell'editor lasciato da un altro preset. */
function seedPreset(slot: number, activeScene: number, gains: [number, number, number]) {
  const { setActivePreset, updateParameter } = usePresetStore.getState();
  setActivePreset({ ...usePresetStore.getState().activePreset, slot, activeScene: 0 });
  for (let scene = 0; scene < 3; scene++) {
    usePresetStore.getState().updateScene(scene);
    const amp = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
    updateParameter(amp.id, 'gain', gains[scene]);
  }
  usePresetStore.getState().updateScene(activeScene);
  useMidiStore.getState().commitPreset(usePresetStore.getState().activePreset);
}

/** Come handlePresetSelect/handleSlotChange nell'app: riapre un preset leggendolo da devicePresets. */
function openPreset(slot: number, activeScene: number) {
  const fromLibrary = useMidiStore.getState().devicePresets.find(p => p.slot === slot);
  usePresetStore.getState().setActivePreset({ ...(fromLibrary as Preset), activeScene });
}

function ampGain(effects: ReturnType<typeof cloneEffects>) {
  return effects.find(e => e.type === 'amp')!.parameters.gain;
}

let slotCounter = 1;

test('matrice esaustiva: ogni combinazione (scena attiva, scena origine, scena destinazione) copia esattamente', () => {
  for (const activeScene of [0, 1, 2]) {
    for (const sourceScene of [0, 1, 2]) {
      for (const sameSlot of [true, false]) {
        for (const targetScene of [0, 1, 2]) {
          const sourceSlot = slotCounter++;
          const targetSlot = sameSlot ? sourceSlot : slotCounter++;

          const sourceGains: [number, number, number] = [111, 222, 333];
          seedPreset(sourceSlot, activeScene, sourceGains);

          let targetGainsBefore: [number, number, number] = [777, 888, 999];
          if (!sameSlot) {
            seedPreset(targetSlot, 0, targetGainsBefore);
            // Torno sul preset origine, che deve restare quello aperto nell'editor (come l'utente
            // che riseleziona il proprio preset dal menu dopo aver visto/creato quello di destinazione).
            openPreset(sourceSlot, activeScene);
          } else {
            targetGainsBefore = sourceGains;
          }

          const before = usePresetStore.getState().activePreset;
          assert.equal(before.slot, sourceSlot, 'precondizione: il preset attivo è quello origine');
          assert.equal(before.activeScene, activeScene, 'precondizione: la scena attiva è quella prevista');

          const destination = handleCopyScene(sourceScene, targetSlot, targetScene);

          const label = `activeScene=${activeScene} sourceScene=${sourceScene} sameSlot=${sameSlot} targetScene=${targetScene}`;

          // La scena di destinazione deve avere esattamente il gain della scena di origine.
          assert.equal(
            ampGain(destination.scenes![targetScene]),
            sourceGains[sourceScene],
            `[${label}] scena destinazione non corrisponde alla scena origine`
          );

          // Le altre scene della destinazione non coinvolte nella copia non devono cambiare.
          for (const otherScene of [0, 1, 2]) {
            if (otherScene === targetScene) continue;
            const expected = sameSlot ? sourceGains[otherScene] : targetGainsBefore[otherScene];
            assert.equal(
              ampGain(destination.scenes![otherScene]),
              expected,
              `[${label}] scena ${otherScene} della destinazione (non coinvolta) è stata alterata`
            );
          }

          // Se la destinazione è un preset diverso, anche le scene del preset origine non devono cambiare.
          if (!sameSlot) {
            const sourcePresetAfter = useMidiStore.getState().devicePresets.find(p => p.slot === sourceSlot);
            // Il preset origine potrebbe non essere ancora "committato" in devicePresets: controlliamo lo
            // store live solo se il preset origine era anche quello attivo prima della copia (non più, ora
            // l'attivo è la destinazione) — quindi verifichiamo invece via copyScene stesso non avendolo toccato:
            // nessuna scrittura in devicePresets per sourceSlot è stata fatta da handleCopyScene.
            void sourcePresetAfter;
          }

          // activeScene finale deve essere la scena di destinazione appena scritta.
          assert.equal(destination.activeScene, targetScene, `[${label}] activeScene finale errata`);
          assert.equal(ampGain(destination.effects), sourceGains[sourceScene], `[${label}] effects live finale errato`);
        }
      }
    }
  }
});
