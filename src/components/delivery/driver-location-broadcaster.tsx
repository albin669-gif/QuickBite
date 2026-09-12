'use client';

import React, { useEffect, useState, useRef } from 'react';
import { broadcastDriverLocationAction } from '@/actions/delivery';
import { Navigation, AlertCircle, CheckCircle2, Radio, Compass } from 'lucide-react';

interface Props {
  orderId: string;
  isActive: boolean;
  onLocationUpdate?: (lat: number, lng: number, heading: number | null) => void;
}

export function DriverLocationBroadcaster({ orderId, isActive, onLocationUpdate }: Props) {
  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator;
  const [permissionStatus, setPermissionStatus] = useState<
    'prompt' | 'granted' | 'denied' | 'unsupported'
  >(() => (typeof window !== 'undefined' && 'geolocation' in navigator ? 'prompt' : 'unsupported'));
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
  } | null>(null);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    typeof window !== 'undefined' && !('geolocation' in navigator)
      ? 'Geolocation is not supported by this browser.'
      : null
  );

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    // Check permission status if API available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          setPermissionStatus(permission.state as 'prompt' | 'granted' | 'denied');
          permission.onchange = () => {
            setPermissionStatus(permission.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {
          // Ignore error on browsers without full permissions query support
        });
    }
  }, [isSupported]);

  useEffect(() => {
    if (!isActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      return;
    }

    // Real device geolocation tracking with high accuracy
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setIsBroadcasting(true);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const heading = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? pos.coords.heading : null;

        setPermissionStatus('granted');
        setCurrentCoords({
          latitude: lat,
          longitude: lng,
          accuracy,
          heading,
        });

        if (onLocationUpdate) {
          onLocationUpdate(lat, lng, heading);
        }

        // Throttle updates to server: at most once every 3 seconds to avoid flooding
        const now = Date.now();
        if (now - lastSentRef.current >= 3000) {
          lastSentRef.current = now;
          try {
            const res = await broadcastDriverLocationAction({
              orderId,
              latitude: lat,
              longitude: lng,
              heading,
            });
            if (res.success) {
              setLastBroadcastTime(new Date());
              setErrorMessage(null);
            } else if (res.error) {
              setErrorMessage(res.error);
            }
          } catch {
            setErrorMessage('Network synchronization issue while broadcasting GPS.');
          }
        }
      },
      (err) => {
        if (err.code === 1) {
          setPermissionStatus('denied');
          setErrorMessage('Location permission denied. Please allow GPS access in your browser settings.');
        } else if (err.code === 2) {
          setErrorMessage('Position unavailable: Unable to acquire GPS satellite lock.');
        } else if (err.code === 3) {
          setErrorMessage('Location request timed out. Retrying...');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, orderId, onLocationUpdate]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isBroadcasting && currentCoords
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-stone-300'
            }`}
          />
          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-orange-600" />
            Live Device GPS Stream
          </span>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            permissionStatus === 'granted'
              ? 'bg-emerald-100 text-emerald-800'
              : permissionStatus === 'denied'
              ? 'bg-red-100 text-red-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {permissionStatus === 'granted'
            ? 'GPS Active'
            : permissionStatus === 'denied'
            ? 'Access Blocked'
            : 'Pending Permission'}
        </span>
      </div>

      {permissionStatus === 'denied' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">GPS Permission Denied</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              Live customer tracking requires device location. Please enable location permissions in browser settings.
            </p>
          </div>
        </div>
      )}

      {currentCoords ? (
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
            <span className="text-[10px] text-stone-500 font-medium block">Current Position</span>
            <span className="font-mono font-bold text-stone-800 text-[11px]">
              {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}
            </span>
          </div>
          <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
            <span className="text-[10px] text-stone-500 font-medium block">Precision & Heading</span>
            <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px]">
              <span>±{Math.round(currentCoords.accuracy)}m</span>
              {currentCoords.heading !== null && (
                <span className="flex items-center text-orange-600">
                  <Compass className="w-3 h-3 ml-1 mr-0.5" />
                  {Math.round(currentCoords.heading)}°
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-2 text-xs text-stone-500">
          <Navigation className="w-4 h-4 animate-spin text-orange-600" />
          <span>Locking on to device GPS satellites...</span>
        </div>
      )}

      {lastBroadcastTime && (
        <div className="flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-100 pt-2">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Realtime broadcast active
          </span>
          <span>{lastBroadcastTime.toLocaleTimeString()}</span>
        </div>
      )}

      {errorMessage && (
        <p className="text-[11px] text-red-600 font-medium pt-1">{errorMessage}</p>
      )}
    </div>
  );
}
