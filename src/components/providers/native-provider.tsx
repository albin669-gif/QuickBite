'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeNativeBridge, isNativePlatform } from '@/lib/capacitor';
import { Network } from '@capacitor/network';
import { WifiOff } from 'lucide-react';

export function NativeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initialize native device features
    initializeNativeBridge((path) => {
      router.push(path);
    });

    // Monitor Network Connectivity
    let networkListener: { remove: () => void } | null = null;
    if (isNativePlatform() || (typeof window !== 'undefined' && 'online' in navigator)) {
      Network.getStatus().then((status) => {
        setIsOffline(!status.connected);
      });

      Network.addListener('networkStatusChange', (status) => {
        setIsOffline(!status.connected);
      }).then((handle) => {
        networkListener = handle;
      });
    }

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, [router]);

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>No internet connection. Waiting for network...</span>
        </div>
      )}
      {children}
    </>
  );
}
