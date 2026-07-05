import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leok.kids',
  appName: 'LEO KIDS',
  webDir: 'out',
  server: {
    url: 'https://www.leokids.co.il',
    cleartext: false,
    allowNavigation: ['www.leokids.co.il', 'leokids.co.il', '*.supabase.co'],
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
