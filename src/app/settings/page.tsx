"use client"

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { Database, ShieldCheck, Info, ExternalLink, AlertCircle, Globe, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  const { user } = useUser();
  const [currentHostname, setCurrentHostname] = useState('...');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname);
    }
  }, []);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Impostazioni</h2>
          <p className="text-muted-foreground">Gestione account, cloud storage e preferenze hardware.</p>
        </header>

        {!user && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-500 font-bold">Sincronizzazione Cloud Disattivata</AlertTitle>
            <AlertDescription className="text-xs">
              Effettua il login con Google per attivare il backup cloud. Senza login, i dati sono salvati solo localmente nel browser.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Cloud Storage
              </CardTitle>
              <CardDescription>Piano Spark (Gratuito)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium uppercase">Firestore Database</span>
                <Badge variant="outline" className="text-green-500 border-green-500/30">ATTIVO</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed italic">
                Il piano Spark di Firebase offre 1GB di database gratuito, sufficiente per migliaia di preset e note.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Privacy & Dati
              </CardTitle>
              <CardDescription>Protezione dei tuoi preset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded border border-border">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-mono text-[10px] truncate">{user.email}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Sincronizzazione attiva. I tuoi dati sono protetti dalle regole di sicurezza di Firebase.
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-xs text-muted-foreground italic">Esegui il login per proteggere i tuoi dati.</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500 uppercase tracking-widest font-bold">
              <Globe className="w-4 h-4" /> Risoluzione Problemi Login
            </CardTitle>
            <CardDescription>Per errori "unauthorized-domain" o "popup-closed"</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-4">
            <div className="space-y-2">
              <div className="font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 1. Autorizza il dominio attuale</div>
              <div className="text-muted-foreground ml-3">Vai nella Console Firebase &gt; Auth &gt; Settings &gt; Authorized Domains e aggiungi:</div>
              <code className="block ml-3 bg-secondary p-2 rounded text-primary font-mono text-center select-all">{currentHostname}</code>
            </div>
            
            <div className="space-y-2">
              <div className="font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 2. Controlla il blocco popup</div>
              <div className="text-muted-foreground ml-3">Se la finestra si chiude da sola (popup-closed), assicurati che il tuo browser non stia bloccando i redirect di Google. Controlla l'icona a destra nella barra degli indirizzi.</div>
            </div>

            <div className="pt-2">
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" asChild>
                <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
                  APRI CONSOLE FIREBASE <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Supporto Tecnico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">App Version</div>
                <div className="font-mono text-xs">1.3.0-stable</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Hardware Target</div>
                <div className="font-mono text-xs">NUX MG-30 (v3.x / v4.x)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
