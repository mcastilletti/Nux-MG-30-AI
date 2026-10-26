
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useMidiStore } from '@/stores/use-midi-store';
import { useNotesCache } from '@/stores/use-notes-cache';
import { LayoutDashboard, Library, Sliders, Settings, Zap, NotebookPen, LogIn, LogOut, User as UserIcon, Users, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { useFirebase, useUser } from '@/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { clearSavedPresets, usePresetPersistence } from '@/hooks/use-preset-persistence';
import { cn } from '@/lib/utils';
import { ConnectionStatus } from '@/components/common/connection-status';
import { ElectricGuitarIcon } from '@/components/icons/electric-guitar-icon';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MOBILE_BAR, MOBILE_MORE, NAV_ENTRIES, SIDEBAR_GROUPS, getActiveNavKey, getRouteTitle, isMoreActive, type NavKey } from './nav-config';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, lastError, initialize, syncActivePreset } = useMidiStore();
  const pathname = usePathname();
  const { auth, googleProvider } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  useWakeLock();
  usePresetPersistence();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // La shell resta montata tra le pagine: ogni nuova pagina parte dall'inizio.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

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
    // Le note in cache appartengono all'account appena disconnesso.
    useNotesCache.getState().clearCache();
    clearSavedPresets();
    toast({
      title: "Logout effettuato",
      description: "Dati cloud disconnessi. L'app continuerà a funzionare in locale.",
    });
  };

  const NAV_ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
    home: LayoutDashboard,
    editor: Sliders,
    library: Library,
    notes: NotebookPen,
    bands: Users,
    instrumentation: ElectricGuitarIcon,
    settings: Settings,
    sysex: Zap,
  };
  const activeKey = getActiveNavKey(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const accountBlock = user ? (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.photoURL || ''} />
          <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-bold">{user.displayName}</p>
          <p className="truncate text-caption font-medium text-muted-foreground">Sincronizzazione cloud attiva</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="min-h-11 w-full gap-2 text-caption font-bold uppercase hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
        <LogOut className="h-3.5 w-3.5" /> Esci
      </Button>
    </div>
  ) : (
    <Button variant="outline" size="sm" className="min-h-11 w-full gap-2 border-primary/20 bg-primary/5 text-body-sm font-bold hover:bg-primary/10" onClick={handleLogin}>
      <LogIn className="h-4 w-4 text-primary" /> Accedi con Google
    </Button>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-white/5">
          <SidebarHeader className="p-4 border-b border-white/5">
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
            {SIDEBAR_GROUPS.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-sm font-bold uppercase tracking-wider opacity-70">{group.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {group.keys.map((key) => {
                    const entry = NAV_ENTRIES[key];
                    const Icon = NAV_ICONS[key];
                    return (
                      <SidebarMenuItem key={key}>
                        <SidebarMenuButton asChild isActive={activeKey === key}>
                          <Link href={entry.href} aria-current={activeKey === key ? 'page' : undefined}>
                            <Icon className="w-4 h-4" />
                            <span className="text-base">{entry.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="text-sm font-bold uppercase tracking-wider opacity-70">Account Google</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">{accountBlock}</SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sm font-bold uppercase tracking-wider opacity-70">Pedaliera</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">
                <ConnectionStatus status={status} lastError={lastError} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 bg-background min-h-[100dvh]">
          <header className="h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] md:h-16 md:pt-0 border-b border-border/70 flex items-center justify-between px-4 md:px-6 bg-background/90 backdrop-blur-md sticky top-0 z-20">
            <div className="flex min-w-0 items-center gap-4">
              {/* Su mobile le sezioni secondarie sono in "Altro": la sidebar serve solo da md in su. */}
              <SidebarTrigger className="hidden md:flex" />
              <div className="mx-2 hidden h-4 w-[1px] bg-white/10 md:block" />
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base font-semibold">
                  {getRouteTitle(pathname)}
                </span>
                <ConnectionStatus status={status} lastError={lastError} />
              </div>
            </div>
          </header>

          <div ref={contentRef} className="flex-1 overflow-auto px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pb-8">
            {children}
          </div>
        </main>

        <nav aria-label="Navigazione rapida" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-5 gap-1 rounded-2xl border border-border bg-sidebar/95 p-1.5 shadow-2xl backdrop-blur-xl md:hidden">
          {MOBILE_BAR.map((key) => {
            const entry = NAV_ENTRIES[key];
            const Icon = NAV_ICONS[key];
            const active = activeKey === key;
            return (
              <Link key={key} href={entry.href} aria-current={active ? 'page' : undefined} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-label font-semibold text-muted-foreground transition-colors", active && "bg-primary/15 text-primary")}>
                <Icon className="h-4 w-4" />
                <span>{entry.label}</span>
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-current={isMoreActive(pathname) ? 'page' : undefined}
                className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-label font-semibold text-muted-foreground transition-colors", isMoreActive(pathname) && "bg-primary/15 text-primary")}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span>Altro</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <SheetHeader className="text-left">
                <SheetTitle>Altro</SheetTitle>
                <SheetDescription>Sezioni, account e stato della pedaliera.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Altre sezioni" className="mt-4 grid grid-cols-2 gap-2">
                {MOBILE_MORE.map((key) => {
                  const entry = NAV_ENTRIES[key];
                  const Icon = NAV_ICONS[key];
                  const active = activeKey === key;
                  return (
                    <Link key={key} href={entry.href} aria-current={active ? 'page' : undefined} className={cn("flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 text-sm font-semibold", active && "border-primary bg-primary/15 text-primary")}>
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{entry.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-5 space-y-3">
                <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Pedaliera</p>
                <ConnectionStatus status={status} lastError={lastError} />
                <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Account Google</p>
                {accountBlock}
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};
