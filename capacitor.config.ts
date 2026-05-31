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
  plugins: {
    SystemBars: {
      // Shell applies native inset padding in MainActivity; do not rely on CSS injection.
      insetsHandling: 'disable',
      style: 'DARK',
      hidden: false,
    },
  },
};

export default config;
