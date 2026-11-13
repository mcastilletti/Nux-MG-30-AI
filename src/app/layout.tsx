import type {Metadata, Viewport} from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AppShell } from '@/components/layout/app-shell';

// Font serviti dall'app stessa (M9): niente richieste a Google, né all'avvio né
// durante la build (su Firebase App Hosting `next/font/google` non riusciva a
// scaricarli), e disponibili offline grazie alla cache della PWA su /_next/static.
// File latin di Fontsource, licenza OFL (src/fonts/OFL-*.txt).
const spaceGrotesk = localFont({ src: '../fonts/space-grotesk-latin-wght-normal.woff2', weight: '300 700', display: 'swap', variable: '--font-space-grotesk' });
const spaceMono = localFont({
  src: [
    { path: '../fonts/space-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/space-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-space-mono',
});

export const viewport: Viewport = {
  themeColor: '#171513',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Con statusBarStyle black-translucent il contenuto va sotto la barra di stato:
  // header, barra in basso e foglio nota usano env(safe-area-inset-*) (N4).
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'MG30 Studio',
  description: 'Editor web per la pedaliera multieffetto NUX MG-30, con note dei brani per prove e live.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MG30 Studio',
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' }
    ],
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`dark ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="font-body antialiased selection:bg-primary/30">
        <FirebaseClientProvider>
          {/* Shell condivisa (N3): MIDI, wake lock e salvataggio dei preset non ripartono a ogni pagina. */}
          <AppShell>{children}</AppShell>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
