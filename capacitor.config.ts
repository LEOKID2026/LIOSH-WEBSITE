import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leok.kids',
  appName: 'LEO K',
  webDir: 'out',
  server: {
    url: 'https://liosh-website.vercel.app',
    cleartext: false,
    allowNavigation: ['liosh-website.vercel.app', '*.supabase.co'],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
