
"use client"

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMidiStore } from '@/stores/use-midi-store';
import { Button } from '@/components/ui/button';
import { Sliders, Library, Zap, Download, RotateCw, Usb, NotebookPen, Users, Guitar } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { status, refreshDevices, availableDevices } = useMidiStore();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8 py-2 md:space-y-10 md:py-4">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <p className="section-kicker mb-2">MG30 Studio</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Il tuo rig, sempre pronto.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">Gestisci preset, scene ed effetti del tuo NUX MG-30 con controlli immediati.</p>
          </div>
        </header>

        {/* Navigation Buttons - Bento Grid Layout */}
        <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Link href="/library" className="group md:col-span-2">
            <Card className="app-surface h-full border-primary/30 transition-colors hover:border-primary/70">
              <CardContent className="flex flex-col items-start justify-between gap-5 p-5 md:flex-row md:items-center md:p-7">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:h-14 md:w-14">
                  <Library className="w-8 h-8 text-accent" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="font-bold md:text-xl">Libreria Preset</h4>
                  <p className="text-xs text-muted-foreground md:text-sm">Sfoglia e gestisci i 128 slot</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/editor" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start justify-between gap-5 p-4 md:items-center md:p-6 md:text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sliders className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold md:text-lg">Visual Editor</h4>
                  <p className="text-xs text-muted-foreground">Regola i parametri</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/notes" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start justify-between gap-5 p-4 md:items-center md:p-6 md:text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <NotebookPen className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold md:text-lg">Note Brani</h4>
                  <p className="text-xs text-muted-foreground">Scalette e accordi</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/bands" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start justify-between gap-5 p-4 md:items-center md:p-6 md:text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold md:text-lg">Gestione Band</h4>
                  <p className="text-xs text-muted-foreground">Organizza i tuoi progetti</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/instrumentation" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start justify-between gap-5 p-4 md:items-center md:p-6 md:text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Guitar className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold md:text-lg">Strumentazione</h4>
                  <p className="text-xs text-muted-foreground">Chitarre e amplificatori</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary Features - Asymmetric Layout */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="group md:col-span-2">
            <Card className="app-surface h-full cursor-pointer transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col items-start gap-4 p-5 md:flex-row md:items-center md:p-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Download className="h-8 w-8" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="font-bold text-xl">Bulk Backup</h4>
                  <p className="text-sm text-muted-foreground">Salva tutti i 128 slot in un singolo file sysex</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Link href="/tools/sysex-analyzer" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col items-start gap-4 p-5 md:items-center md:p-6 md:text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Zap className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-lg">AI Analyzer</h4>
                  <p className="text-sm text-muted-foreground">Reverse engineering</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="app-surface lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Usb className="w-5 h-5 text-primary" />
                    Stato Connessione
                  </CardTitle>
                  <CardDescription>Panoramica connettività hardware</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshDevices} className="border-white/10 hover:bg-white/5">
                  <RotateCw className="w-4 h-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 p-6 rounded-xl bg-card/50 border border-white/5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.3)]">
                <div className={`p-4 rounded-full ${status === 'connected' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                   <Usb className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xl font-bold uppercase tracking-wider">{status}</div>
                  <p className="text-sm text-muted-foreground">
                    {status === 'connected'
                      ? "Dispositivo rilevato: NUX MG-30 pronto per l'editing."
                      : "Nessun dispositivo rilevato. Collega l'MG-30 via USB per il controllo real-time."}
                  </p>
                </div>
              </div>

              {availableDevices.inputs.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold">Porte MIDI Disponibili</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-card/50 border border-white/5 shadow-sm">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Input</p>
                      {availableDevices.inputs.map(d => (
                        <div key={d.id} className="text-xs truncate">{d.name}</div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-white/5 shadow-sm">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Output</p>
                      {availableDevices.outputs.map(d => (
                        <div key={d.id} className="text-xs truncate">{d.name}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
