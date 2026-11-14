'use client';

import React, { memo, useCallback } from 'react';
import { Panel } from '@/components/common/panel';
import { CATEGORY_LONG, categoryColor } from '@/components/common/category-chip';
import { DeviceArt, DEVICE_LABEL } from '@/components/device-art';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { OptionParam } from '@/components/controls/option-param';
import { deviceArtFor, micKindFor } from '@/lib/device-art-map';
import { MG30_MODELS } from '@/lib/mg30-data';
import { cn } from '@/lib/utils';
import type { EffectState } from '@/types/preset';

/**
 * Pannello del blocco selezionato: a sinistra (da `lg`; sopra su telefono) l'immagine del modello con
 * categoria, nome, bypass e cambio modello; a destra le manopole.
 */
export const BlockParamsPanel = memo(function BlockParamsPanel({ selectedEffect, handleModelChange, handleToggleBlock, handleParamChange }: {
  selectedEffect: EffectState;
  handleModelChange: (effectId: string, type: string, modelId: string) => void;
  handleToggleBlock: (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => void;
  handleParamChange: (effectType: string, paramId: string, value: number, index: number) => void;
}) {
  const models = MG30_MODELS[selectedEffect.type] || [];
  const currentModelData = models.find(m => m.id === selectedEffect.model) || models[0];
  const parameters = currentModelData?.parameters;
  const spec = deviceArtFor(selectedEffect.type, currentModelData?.id ?? selectedEffect.model);
  const color = categoryColor(selectedEffect.type);

  // Microfono dell'IR (quando il modello ne ha uno): disegnato accanto alla cassa.
  const micParam = parameters?.find((p) => p.id === 'mic');
  const micIndex = micParam ? Number(selectedEffect.parameters.mic ?? micParam.default) - micParam.min : -1;
  const micLabel = micParam?.options?.[micIndex];

  // Gestore stabile per tutte le manopole: solo quella che cambia valore si ridisegna.
  const handleKnobChange = useCallback((value: number, index: number) => {
    const param = parameters?.[index];
    if (param) handleParamChange(selectedEffect.type, param.id, value, index);
  }, [parameters, selectedEffect.type, handleParamChange]);

  return (
    <div className="grid gap-3 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-4">
      <Panel className="flex flex-col gap-3 p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.12em]" style={{ color }}>
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {CATEGORY_LONG[selectedEffect.type]}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={selectedEffect.enabled}
            aria-label={`${selectedEffect.enabled ? 'Disattiva' : 'Attiva'} ${selectedEffect.type}`}
            onClick={() => handleToggleBlock({ stopPropagation: () => { } } as unknown as React.MouseEvent, selectedEffect.id, selectedEffect.type, selectedEffect.enabled)}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors',
              selectedEffect.enabled ? 'border-success/50 bg-success/10 text-success' : 'border-border bg-inset text-muted-foreground',
            )}
          >
            <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', selectedEffect.enabled ? 'bg-success' : 'bg-muted-foreground/50')} />
            {selectedEffect.enabled ? 'Acceso' : 'Bypass'}
          </button>
        </div>

        <div className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-3">
          <div className="flex shrink-0 items-center justify-center gap-3 rounded-xl bg-inset p-3 lg:py-5">
            <DeviceArt
              kind={spec.kind}
              knobs={spec.knobs}
              model={spec.model}
              color={color}
              on={selectedEffect.enabled}
              label={`${DEVICE_LABEL[spec.kind]}: ${currentModelData?.name ?? ''}`}
              size={96}
              className="lg:h-[150px] lg:w-auto"
            />
            {selectedEffect.type === 'ir' && micLabel && (
              <div className="flex flex-col items-center gap-1">
                <DeviceArt kind={micKindFor(micLabel)} color="hsl(var(--block-ir))" on={selectedEffect.enabled} label={`${DEVICE_LABEL[micKindFor(micLabel)]}: ${micLabel}`} size={72} className="lg:h-[110px] lg:w-auto" />
                <span className="font-code text-micro font-bold text-muted-foreground">{micLabel}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 lg:flex-none">
            <h2 className="truncate text-xl font-bold lg:text-2xl" title={currentModelData?.name}>{currentModelData?.name}</h2>
            <p className="line-clamp-2 text-body-sm text-muted-foreground">{currentModelData?.fullName}</p>
          </div>
        </div>

        <ModelPicker effectId={selectedEffect.id} type={selectedEffect.type} model={selectedEffect.model} onChange={handleModelChange} />
      </Panel>

      <Panel className="p-4 md:p-5 lg:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold">Parametri</h2>
          <span className="hidden text-caption text-muted-foreground lg:inline">Trascina in verticale · Maiusc: fine · doppio clic: valore iniziale</span>
        </div>
        {currentModelData && (
          <div className="grid grid-cols-4 items-start gap-x-1 gap-y-5 lg:gap-y-8">
            {currentModelData.parameters.map((param, index) => {
              const value = Number(selectedEffect.parameters[param.id.toLowerCase()] ?? param.default);
              // Valori a nome (microfono, posizione, Sub Div…): si sceglie il nome, non un numero.
              return param.options ? (
                <div key={param.id} className="col-span-4 px-1 lg:col-span-2">
                  <OptionParam label={param.name} options={param.options} value={value} min={param.min} index={index} onChange={handleKnobChange} />
                </div>
              ) : (
                <div key={param.id} className="flex justify-center">
                  <RotaryKnob label={param.name} value={value} min={param.min} max={param.max} step={param.step} unit={param.unit} defaultValue={param.default} index={index} onChange={handleKnobChange} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
});

/** Menu dei modelli: separato dal pannello, non si ridisegna a ogni giro di manopola. */
const ModelPicker = memo(function ModelPicker({ effectId, type, model, onChange }: {
  effectId: string;
  type: EffectState['type'];
  model: string;
  onChange: (effectId: string, type: string, modelId: string) => void;
}) {
  const availableModels = MG30_MODELS[type] || [];
  return (
    <Select value={model} onValueChange={(val) => onChange(effectId, type, val)}>
      <SelectTrigger aria-label={`Modello ${type}`} className="h-11 w-full bg-inset font-semibold">
        <SelectValue placeholder="Modello" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(24rem,60vh)]">
        {availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
});
