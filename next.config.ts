import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  disable: process.env.NODE_ENV === "development",
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    // Le richieste di Firestore (long polling in tempo reale) e di Firebase Auth devono andare
    // dirette in rete: se il service worker le intercetta, le connessioni "Listen" vengono interrotte.
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) => /(^|\.)(firestore|identitytoolkit|securetoken)\.googleapis\.com$/.test(url.hostname),
        handler: 'NetworkOnly',
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
