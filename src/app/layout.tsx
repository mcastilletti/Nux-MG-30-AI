import type {Metadata, Viewport} from 'next';
import { Outfit, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AppShell } from '@/components/layout/app-shell';

// Font serviti dall'app stessa (M9): niente richieste a Google all'avvio e
// disponibili offline grazie alla cache della PWA su /_next/static.
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], display: 'swap', variable: '--font-outfit' });
const sourceCodePro = Source_Code_Pro({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap', variable: '--font-source-code' });

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
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
    <html lang="it" className={`dark ${outfit.variable} ${sourceCodePro.variable}`}>
      <body className="font-body antialiased selection:bg-primary/30">
        <FirebaseClientProvider>
          {/* Shell condivisa (N3): MIDI, wake lock e salvataggio dei preset non ripartono a ogni pagina. */}
          <AppShell>{children}</AppShell>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
