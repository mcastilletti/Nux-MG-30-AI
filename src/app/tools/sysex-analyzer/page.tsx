"use client"

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Zap, Play, Trash2, Copy, History, Loader2, Binary } from 'lucide-react';
import { analyzeSysEx } from '@/ai/flows/sysex-analysis';

export default function SysExAnalyzerPage() {
  const [sysexData, setSysexData] = useState('');
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!sysexData || !description) {
      toast({
        title: "Input required",
        description: "Please provide both SysEx messages and a control description.",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const output = await analyzeSysEx({
        sysexData,
        controlDescription: description
      });
      setResult(output.parameterMapping);
      toast({
        title: "Analysis complete",
        description: "AI has successfully mapped the SysEx parameter."
      });
    } catch (err) {
      toast({
        title: "Analysis failed",
        description: "Something went wrong during AI processing.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSysexData('');
    setDescription('');
    setResult(null);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">AI SysEx Analyzer</h2>
            <p className="text-muted-foreground">Reverse engineer NUX MG-30 messages using AI assistance.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Input Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-muted-foreground">SysEx Message Sequence</label>
                <Textarea 
                  placeholder="e.g. F0 00 20 6B 01 00 00 45 F7..." 
                  className="font-mono text-sm h-48 bg-secondary/20"
                  value={sysexData}
                  onChange={(e) => setSysexData(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-muted-foreground">Control Description</label>
                <Input 
                  placeholder="e.g. Changed Amp Gain from 0 to 100" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 gap-2 bg-yellow-600 hover:bg-yellow-700 text-white" 
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Analyze with AI
                </Button>
                <Button variant="outline" size="icon" onClick={handleClear} disabled={analyzing}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-border transition-all ${result ? 'border-primary/50' : ''}`}>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">AI Results</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] flex flex-col">
              {result ? (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 p-4 rounded-lg bg-primary/5 border border-primary/20 overflow-auto">
                    <div className="flex items-center gap-2 mb-3 text-primary">
                       <Binary className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-widest">Analysis Mapping</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1 gap-2" onClick={() => {
                      navigator.clipboard.writeText(result);
                      toast({ title: "Copied to clipboard" });
                    }}>
                      <Copy className="w-4 h-4" /> Copy result
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <History className="w-4 h-4" /> History
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg opacity-50">
                  <div className="p-4 rounded-full bg-secondary mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold mb-1">Ready to Analyze</h4>
                  <p className="text-xs text-muted-foreground">Paste your captured MIDI data and click analyze to let the AI process it.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-secondary/10">
           <CardHeader>
              <CardTitle className="text-sm">How it works</CardTitle>
           </CardHeader>
           <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>1. Connect your NUX MG-30 and open a MIDI monitor tool (like aseqdump on Linux).</p>
              <p>2. Perform a specific action on the pedalboard, like moving the Gain knob from 0 to 100.</p>
              <p>3. Capture the sequence of SysEx messages generated and paste them here.</p>
              <p>4. Describe the action clearly so the AI can find the pattern in the hex data.</p>
           </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
