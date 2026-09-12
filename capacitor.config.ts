import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quickbite.app',
  appName: 'QuickBite',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://quickbite.app',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#EA580C',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
