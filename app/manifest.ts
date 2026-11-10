import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa',
    name: 'BeyondLimits — Discipline & Workout Tracker',
    short_name: 'BeyondLimits',
    description:
      'Daily motivation with strong voice, personal habit and relapse progress analytics, and 12-exercise home workout for your discipline journey.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'fullscreen',
    display_override: [
      'fullscreen',
      'standalone',
    ],
    orientation: 'portrait',
    background_color: '#060913',
    theme_color: '#060913',
    categories: ['fitness', 'health', 'lifestyle'],
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
