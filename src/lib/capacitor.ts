import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

export const initializeNativeBridge = async (onNavigate?: (path: string) => void) => {
  if (!isNativePlatform()) return;

  try {
    // 1. Status bar customization
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#EA580C' });
  } catch (e) {
    console.debug('StatusBar not supported on web:', e);
  }

  try {
    // 2. Hide splash screen once page is ready
    await SplashScreen.hide();
  } catch (e) {
    console.debug('SplashScreen not supported on web:', e);
  }

  // 3. Android Hardware Back Button
  App.addListener('backButton', ({ canGoBack }) => {
    const currentPath = window.location.pathname;

    // Root / exit pages: exit app
    if (currentPath === '/' || currentPath === '/login') {
      App.exitApp();
    } else if (canGoBack) {
      window.history.back();
    } else {
      if (onNavigate) {
        onNavigate('/');
      } else {
        window.location.href = '/';
      }
    }
  });

  // 4. Deep link listener (Android App Links / Custom schemes)
  App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url);
      const targetPath = url.pathname + url.search;
      if (onNavigate && targetPath) {
        onNavigate(targetPath);
      }
    } catch (err) {
      console.error('Failed to parse deep link URL:', err);
    }
  });
};

export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Ignore if not supported
    }
  }
};

export const getNetworkStatus = async () => {
  try {
    return await Network.getStatus();
  } catch {
    return { connected: true, connectionType: 'unknown' };
  }
};
