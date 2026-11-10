import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beyondlimits.app',
  appName: 'BeyondLimits',
  webDir: 'public',
  server: {
    url: 'https://project-vuxsx.vercel.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'project-vuxsx.vercel.app',
      '*.vercel.app',
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'accounts.google.com',
      '*.google.com',
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {},
};

export default config;

