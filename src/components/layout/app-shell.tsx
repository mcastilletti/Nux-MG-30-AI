
'use client';

import React, { useEffect } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useMidiStore } from '@/stores/use-midi-store';
import { LayoutDashboard, Library, Sliders, Settings, Zap, Wifi, WifiOff, NotebookPen, LogIn, LogOut, User as UserIcon, AlertCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';
import { useFirebase, useUser } from '@/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWakeLock } from '@/hooks/use-wake-lock';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, initialize, syncActivePreset } = useMidiStore();
  const pathname = usePathname();
  const { auth, googleProvider } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  useWakeLock();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Login effettuato",
        description: "Bentornato! I tuoi dati sono ora sincronizzati nel cloud.",
      });
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Login Interrotto",
          description: "La finestra di login è stata chiusa prima del completamento. Riprova o controlla le impostazioni dei popup del browser.",
        });
      } else if (error.code === 'auth/unauthorized-domain') {
        toast({
          variant: "destructive",
          title: "Dominio non autorizzato",
          description: "Questo indirizzo non è autorizzato in Firebase. Vai in Settings per le istruzioni.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Errore Login",
          description: error.message || "Si è verificato un errore durante l'autenticazione.",
        });
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast({
      title: "Logout effettuato",
      description: "Dati cloud disconnessi. L'app continuerà a funzionare in locale.",
    });
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'Editor', href: '/editor', icon: Sliders },
    { label: 'Note', href: '/notes', icon: NotebookPen },
    { label: 'Band', href: '/bands', icon: Users },
    { label: 'SysEx Analyzer', href: '/tools/sysex-analyzer', icon: Zap },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-[70px] h-[70px] flex items-center justify-center overflow-hidden">
                <img 
                  src="/icon.png" 
                  alt="MG30 Studio Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">MG30 STUDIO</h1>
                <p className="text-[12px] text-muted-foreground uppercase tracking-widest">NUX EDITOR</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sm font-bold uppercase tracking-wider opacity-70">Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span className="text-base">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="text-sm font-bold uppercase tracking-wider opacity-70">Account Google</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">
                {user ? (
                  <div className="flex flex-col gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={user.photoURL || ''} />
                        <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate">{user.displayName}</p>
                        <p className="text-[12px] text-muted-foreground truncate font-medium">Cloud Active</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[12px] font-bold uppercase gap-2 w-full hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                      <LogOut className="w-3.5 h-3.5" /> Esci
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full gap-2 text-[13px] font-bold h-10 border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={handleLogin}>
                    <LogIn className="w-4 h-4 text-primary" /> Login con Google
                  </Button>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sm font-bold uppercase tracking-wider opacity-70">Hardware Status</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[13px] font-bold uppercase tracking-tight">{status}</span>
                  </div>
                  {status === 'connected' ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Settings className="w-4 h-4" />
                    <span className="text-base">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 bg-background h-screen">
          <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-[1px] bg-border mx-2" />
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">
                  {navItems.find(i => i.href === pathname)?.label || 'App'}
                </span>
                {status === 'connected' && (
                  <Badge variant="outline" className="text-[12px] h-5 border-green-500/50 text-green-500">
                    USB MIDI ACTIVE
                  </Badge>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};
