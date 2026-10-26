/** Input tipici incollati nell'AI Mode, usati dai test di caratterizzazione. */
export const PRESET_JSON_CASES: Record<string, unknown> = {
  signalChain: { signal_chain: { amp: { status: 'on', model: 'Plexi 100W', params: { gain: 80, bass: 40 } }, reverb: { enabled: false }, delay: { model: 'Analog', params: { mix: 25, time: 400 } } } },
  midiCcParameters: { midi_data: { instructions: { CC_Parameters: { amp_gain: 70, reverb_level: 35, noise_gate_threshold: 30 } } } },
  flatByType: { amp: { gain: 66, master: 55 }, compressor: { status: 'on', sustain: 60 } },
  arrayOfBlocks: [{ type: 'amp', params: { gain: 90 } }, { type: 'reverb', enabled: true, params: { decay: 70 } }],
  outOfRange: { signal_chain: { amp: { params: { gain: 999 } } } },
  unknown: { foo: 'bar' },
};
