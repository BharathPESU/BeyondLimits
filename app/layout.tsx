import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
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
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Bharath CD & Bharath R — Discipline & Attendance Tracker',
  description:
    'Strict daily self-control attendance, relapse reason logging, weekly achievement leaderboard, and monthly progress analytics powered by SQLite.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Discipline',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Bharath CD & Bharath R — Discipline & Attendance Tracker',
    description:
      'Strict daily self-control attendance, relapse reason logging, weekly achievement leaderboard, and monthly progress analytics powered by SQLite.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bharath CD & Bharath R — Discipline & Attendance Tracker',
    description:
      'Strict daily self-control attendance, relapse reason logging, weekly achievement leaderboard, and monthly progress analytics powered by SQLite.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <head>
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
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}