import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#060913',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'BeyondLimits — Discipline & Workout Tracker',
  description:
    'Strict daily self-control attendance, relapse reason logging, weekly achievement leaderboard, and monthly progress analytics.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BeyondLimits',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'application-name': 'BeyondLimits',
  },
  openGraph: {
    title: 'BeyondLimits — Discipline & Workout Tracker',
    description:
      'Strict daily self-control attendance, relapse reason logging, weekly achievement leaderboard, and monthly progress analytics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeyondLimits — Discipline & Workout Tracker',
    description:
      'Strict daily self-control attendance, relapse reason logging, weekly achievement leaderboard, and monthly progress analytics.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="theme-color" content="#060913" />
        <meta name="msapplication-navbutton-color" content="#060913" />
        <meta name="msapplication-starturl" content="/?source=pwa" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans selection:bg-teal-600 selection:text-white"
      >
        <ClerkProvider
          appearance={{
            options: {
              unsafe_disableDevelopmentModeWarnings: true,
            },
          }}
        >
          <ServiceWorkerRegister />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
