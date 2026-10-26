'use client';

import React, { memo, useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { OptionParam } from '@/components/controls/option-param';
import { cn } from '@/lib/utils';
import { MG30_MODELS } from '@/lib/mg30-data';
import type { EffectState } from '@/types/preset';
import { getBlockColorVar } from './block-colors';

/** Pannello del blocco selezionato: modello, bypass e manopole. */
export const BlockParamsPanel = memo(function BlockParamsPanel({ selectedEffect, handleModelChange, handleToggleBlock, handleParamChange }: {
  selectedEffect: EffectState;
  handleModelChange: (effectId: string, type: string, modelId: string) => void;
  handleToggleBlock: (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => void;
  handleParamChange: (effectType: string, paramId: string, value: number, index: number) => void;
}) {
  const currentModelData = MG30_MODELS[selectedEffect.type]?.find(m => m.id === selectedEffect.model) || MG30_MODELS[selectedEffect.type]?.[0];
  const currentBlockColor = `hsl(${getBlockColorVar(selectedEffect.type)})`;
  const parameters = currentModelData?.parameters;
  // Gestore stabile per tutte le manopole: solo quella che cambia valore si ridisegna.
  const handleKnobChange = useCallback((value: number, index: number) => {
    const param = parameters?.[index];
    if (param) handleParamChange(selectedEffect.type, param.id, value, index);
  }, [parameters, selectedEffect.type, handleParamChange]);
  return (
    <Card
      className="rounded-2xl shadow-none transition-colors"
      style={{
        borderColor: selectedEffect.enabled
          ? `hsl(${getBlockColorVar(selectedEffect.type)} / 0.4)`
          : 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-border/50 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Settings2
            className="w-5 h-5 transition-colors"
            style={{
              color: selectedEffect.enabled
                ? `hsl(${getBlockColorVar(selectedEffect.type)})`
                : 'hsl(0, 0%, 50%)'
            }}
          />
          <CardTitle
            className="text-base uppercase md:text-lg transition-colors"
            style={{
              color: selectedEffect.enabled
                ? `hsl(${getBlockColorVar(selectedEffect.type)})`
                : 'hsl(0, 0%, 65%)'
            }}
          >
            {selectedEffect?.type} <Badge variant="outline" className={cn("text-label ml-2", !selectedEffect.enabled && "text-muted-foreground border-zinc-700")}>{selectedEffect?.model}</Badge>
          </CardTitle>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-4">
          <ModelPicker effectId={selectedEffect.id} type={selectedEffect.type} model={selectedEffect.model} onChange={handleModelChange} />
          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="hidden sm:inline">{selectedEffect?.enabled ? 'Attivo' : 'Bypass'}</span>
            <Switch
              aria-label={`${selectedEffect?.enabled ? 'Disattiva' : 'Attiva'} ${selectedEffect?.type}`}
              checked={selectedEffect?.enabled}
              className="data-[state=checked]:bg-transparent"
              style={selectedEffect?.enabled ? { backgroundColor: `hsl(${getBlockColorVar(selectedEffect.type)})` } : undefined}
              onCheckedChange={() => handleToggleBlock({ stopPropagation: () => { } } as any, selectedEffect!.id, selectedEffect!.type, selectedEffect!.enabled)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 md:p-8 lg:p-10">
        {currentModelData && (
          <div className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-9 sm:grid-cols-4 sm:gap-x-8 lg:grid-cols-5 lg:gap-y-12">
            {currentModelData.parameters.map((param, index) => {
              const value = Number(selectedEffect.parameters[param.id.toLowerCase()] ?? param.default);
              // Valori a nome (microfono, posizione, Sub Div…): si sceglie il nome, non un numero.
              return param.options ? (
                <div key={param.id} className="col-span-2 w-full max-w-sm">
                  <OptionParam label={param.name} options={param.options} value={value} min={param.min} index={index} onChange={handleKnobChange} color={currentBlockColor} />
                </div>
              ) : (
                <div key={param.id}>
                  <RotaryKnob label={param.name} value={value} min={param.min} max={param.max} step={param.step} index={index} onChange={handleKnobChange} color={currentBlockColor} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
      <SelectTrigger aria-label={`Modello ${type}`} className="h-11 w-full sm:w-[220px]"><SelectValue placeholder="Model" /></SelectTrigger>
      <SelectContent>{availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
    </Select>
  );
});
