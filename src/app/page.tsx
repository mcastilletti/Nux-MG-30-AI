
"use client"

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMidiStore } from '@/stores/use-midi-store';
import { Button } from '@/components/ui/button';
import { Sliders, Library, Zap, Download, RotateCw, Usb, NotebookPen } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { status, refreshDevices, availableDevices } = useMidiStore();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Gestisci il tuo NUX MG-30 e la tua libreria di preset.</p>
          </div>
        </header>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Link href="/library" className="group">
            <Card className="h-full border-border hover:border-accent/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Library className="w-6 h-6 text-accent" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">Libreria Preset</h4>
                  <p className="text-xs text-muted-foreground">Sfoglia la tua collezione</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/editor" className="group">
            <Card className="h-full border-border hover:border-primary/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sliders className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">Visual Editor</h4>
                  <p className="text-xs text-muted-foreground">Regola i parametri</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/notes" className="group">
            <Card className="h-full border-border hover:border-orange-500/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <NotebookPen className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">Note Brani</h4>
                  <p className="text-xs text-muted-foreground">Scalette e accordi</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tools/sysex-analyzer" className="group">
            <Card className="h-full border-border hover:border-yellow-500/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">AI Analyzer</h4>
                  <p className="text-xs text-muted-foreground">Reverse engineering</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full border-border cursor-pointer hover:border-green-500/50 transition-colors bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-center">
                <h4 className="font-bold">Bulk Backup</h4>
                <p className="text-xs text-muted-foreground">Salva tutti i 128 slot</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Usb className="w-5 h-5 text-primary" />
                    Stato Connessione
                  </CardTitle>
                  <CardDescription>Panoramica connettività hardware</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshDevices}>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 p-4 rounded-lg bg-card border border-border shadow-sm">
                <div className={`p-4 rounded-full ${status === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
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
                    <div className="p-3 rounded-md bg-secondary/30 border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Input</p>
                      {availableDevices.inputs.map(d => (
                        <div key={d.id} className="text-xs truncate">{d.name}</div>
                      ))}
                    </div>
                    <div className="p-3 rounded-md bg-secondary/30 border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Output</p>
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
