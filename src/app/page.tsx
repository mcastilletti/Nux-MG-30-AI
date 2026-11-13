
"use client"

import { useShallow } from 'zustand/react/shallow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMidiStore } from '@/stores/use-midi-store';
import { Button } from '@/components/ui/button';
import { Sliders, Library, Zap, Download, RotateCw, Usb, NotebookPen, Users } from 'lucide-react';
import { ElectricGuitarIcon } from '@/components/icons/electric-guitar-icon';
import Link from 'next/link';

import { PageHeader } from '@/components/common/page-header';
export default function HomePage() {
  const { status, refreshDevices, availableDevices } = useMidiStore(useShallow((s) => ({ status: s.status, refreshDevices: s.refreshDevices, availableDevices: s.availableDevices })));

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8 py-2 md:space-y-10 md:py-4">
        <PageHeader kicker="MG30 Studio" title="Il tuo rig, sempre pronto." description="Gestisci preset, scene ed effetti del tuo NUX MG-30 con controlli immediati." />

        {/* Navigation Buttons - Bento Grid Layout */}
        <div className="grid auto-rows-fr grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <Link href="/library" className="group col-span-2 lg:row-span-2">
            <Card className="app-surface h-full border-primary/30 transition-colors hover:border-primary/70">
              <CardContent className="flex h-full flex-row items-center gap-5 p-5 lg:flex-col lg:justify-center lg:gap-6 lg:p-7 lg:text-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary lg:h-16 lg:w-16">
                  <Library className="w-8 h-8 text-primary" />
                </div>
                <div className="text-left lg:text-center">
                  <h3 className="font-bold md:text-xl lg:text-2xl">Libreria Preset</h3>
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
                  <h3 className="font-bold md:text-lg">Visual Editor</h3>
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
                  <h3 className="font-bold md:text-lg">Note Brani</h3>
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
                  <h3 className="font-bold md:text-lg">Gestione Band</h3>
                  <p className="text-xs text-muted-foreground">Organizza i tuoi progetti</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/instrumentation" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start justify-between gap-5 p-4 md:items-center md:p-6 md:text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ElectricGuitarIcon className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold md:text-lg">Strumentazione</h3>
                  <p className="text-xs text-muted-foreground">Chitarre e amplificatori</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary Features - Asymmetric Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Link href="/library" className="group block rounded-xl lg:col-span-3">
            <Card className="app-surface h-full cursor-pointer transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 md:flex-row md:items-center md:p-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Download className="h-8 w-8" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-xl">Backup dei preset</h3>
                  <p className="text-sm text-muted-foreground">Esporta i 128 preset in un file JSON: Library → Backup</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tools/sysex-analyzer" className="group">
            <Card className="app-surface h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 md:items-center md:justify-center md:p-6 md:text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Zap className="h-7 w-7" />
                </div>
                <div className="text-left md:text-center">
                  <h3 className="font-bold text-lg">AI Analyzer</h3>
                  <p className="text-sm text-muted-foreground">Reverse engineering</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Connection Status */}
        <div>
          <Card className="app-surface">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Usb className="w-5 h-5 text-primary" />
                    Stato Connessione
                  </CardTitle>
                  <CardDescription>Panoramica connettività hardware</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshDevices} className="">
                  <RotateCw className="w-4 h-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 rounded-xl border border-border bg-inset p-6">
                <div className={`p-4 rounded-full ${status === 'connected' ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
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
                  <h3 className="text-sm font-semibold">Porte MIDI Disponibili</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-inset p-4">
                      <p className="text-label text-muted-foreground uppercase font-bold mb-2">Input</p>
                      {availableDevices.inputs.map(d => (
                        <div key={d.id} className="text-xs truncate">{d.name}</div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-border bg-inset p-4">
                      <p className="text-label text-muted-foreground uppercase font-bold mb-2">Output</p>
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
    </>
  );
}
