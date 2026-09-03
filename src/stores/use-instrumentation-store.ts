import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Amplifier, Guitar } from '@/types/instrumentation';

interface InstrumentationStore {
  guitars: Guitar[];
  amplifiers: Amplifier[];
  selectedGuitarId?: string;
  selectedAmplifierId?: string;
  setGuitars: (guitars: Guitar[]) => void;
  setAmplifiers: (amplifiers: Amplifier[]) => void;
  selectGuitar: (id?: string) => void;
  selectAmplifier: (id?: string) => void;
}

export const useInstrumentationStore = create<InstrumentationStore>()(
  persist(
    (set) => ({
      guitars: [],
      amplifiers: [],
      selectedGuitarId: undefined,
      selectedAmplifierId: undefined,
      setGuitars: (guitars) => set({ guitars }),
      setAmplifiers: (amplifiers) => set({ amplifiers }),
      selectGuitar: (selectedGuitarId) => set({ selectedGuitarId }),
      selectAmplifier: (selectedAmplifierId) => set({ selectedAmplifierId }),
    }),
    { name: 'mg30-instrumentation' },
  ),
);
