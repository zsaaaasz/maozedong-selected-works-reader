import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.maoxuan.reader',
  appName: '毛泽东选集',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      // Android 12+ only allows the system app icon during its launch splash.
      // The full artwork is shown by the first web view frame instead.
      launchShowDuration: 0,
      backgroundColor: '#080504',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F3F4EF',
      overlaysWebView: false,
    },
  },
};

export default config;
