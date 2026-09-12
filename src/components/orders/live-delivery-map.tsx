'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrderDeliveryTrackingAction } from '@/actions/delivery';
import type { DeliveryAssignment } from '@/types/database.types';
import {
  Bike,
  Store,
  MapPin,
  Compass,
  Phone,
  Radio,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface Props {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  customerAddressText: string;
  orderStatus?: string;
}

export function LiveDeliveryMap({
  orderId,
  orderNumber,
  restaurantName,
  customerAddressText,
}: Props) {
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState<string>('Just now');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const res = await getOrderDeliveryTrackingAction(orderId);
      if (isMounted) {
        setAssignment(res.assignment);
        setLoading(false);
      }
    }

    loadData();

    // Supabase Realtime Subscription to delivery_assignments
    const supabase = createClient();
    const channel = supabase
      .channel(`delivery-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) {
            setAssignment(payload.new as DeliveryAssignment);
            setLastUpdateText(new Date().toLocaleTimeString());
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-6 text-center space-y-2 animate-pulse">
        <div className="h-48 bg-stone-100 rounded-2xl" />
        <p className="text-xs text-stone-400">Loading live tracking details...</p>
      </div>
    );
  }

  // If no driver assigned yet
  if (!assignment || !assignment.driver_id) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-stone-400" />
            <h3 className="text-sm font-bold text-stone-900">Delivery Partner Tracking</h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Awaiting Driver Assignment
          </span>
        </div>
        <p className="text-xs text-stone-600">
          Our partner fleet is monitoring order #{orderNumber}. A delivery executive will be assigned once your meal is prepared.
        </p>
      </div>
    );
  }

  const hasCoords =
    typeof assignment.current_latitude === 'number' &&
    typeof assignment.current_longitude === 'number' &&
    !isNaN(assignment.current_latitude) &&
    !isNaN(assignment.current_longitude);

  const lat = assignment.current_latitude;
  const lng = assignment.current_longitude;
  const heading = assignment.heading;

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-4">
      {/* Header bar */}
      <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">
                {assignment.driver_name || 'Delivery Executive'}
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {assignment.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {assignment.vehicle_details || 'Verified QuickBite Partner'}
            </p>
          </div>
        </div>

        {assignment.driver_phone && (
          <a
            href={`tel:${assignment.driver_phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-800 hover:bg-stone-50 transition shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            Call Partner
          </a>
        )}
      </div>

      {/* Live Map Representation */}
      <div className="px-5 space-y-3">
        <div className="relative h-60 w-full bg-gradient-to-br from-slate-900 via-stone-900 to-slate-950 rounded-2xl border border-stone-800 overflow-hidden shadow-inner flex flex-col justify-between p-4">
          {/* Subtle Map Grid background pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #000000 1px)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
            }}
          />

          {/* Top Status Overlay */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-stone-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-stone-700 text-stone-300 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime GPS Connected</span>
            </div>

            {hasCoords && (
              <span className="text-[10px] font-mono text-stone-400 bg-stone-950/80 px-2 py-0.5 rounded-md border border-stone-800">
                {lat?.toFixed(4)}, {lng?.toFixed(4)}
              </span>
            )}
          </div>

          {/* Center Stage: Interactive Journey Indicators */}
          <div className="relative z-10 my-auto flex items-center justify-between max-w-md mx-auto w-full px-4">
            {/* Restaurant Node */}
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="w-9 h-9 rounded-xl bg-orange-600/90 text-white flex items-center justify-center shadow-lg border border-orange-400/40">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-stone-300 max-w-[80px] truncate">
                {restaurantName}
              </span>
            </div>

            {/* Connecting Track */}
            <div className="flex-1 mx-3 relative h-1 bg-stone-700 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 transition-all duration-700 ${
                  assignment.status === 'DELIVERED'
                    ? 'w-full'
                    : assignment.status === 'OUT_FOR_DELIVERY'
                    ? 'w-2/3'
                    : 'w-1/3'
                }`}
              />
            </div>

            {/* Live Driver Marker */}
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="relative w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl border-2 border-white animate-bounce">
                <Bike className="w-5 h-5" />
                {heading !== null && heading !== undefined && (
                  <div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-white text-stone-900 rounded-full flex items-center justify-center text-[8px] font-bold shadow"
                    title={`Heading ${Math.round(heading)}°`}
                  >
                    <Compass className="w-3 h-3 text-emerald-600" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-extrabold text-emerald-400">
                Live Partner
              </span>
            </div>

            {/* Connecting Track 2 */}
            <div className="flex-1 mx-3 relative h-1 bg-stone-700 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 bottom-0 left-0 bg-emerald-400 transition-all duration-700 ${
                  assignment.status === 'DELIVERED' ? 'w-full' : 'w-0'
                }`}
              />
            </div>

            {/* Destination Node */}
            <div className="flex flex-col items-center gap-1 text-center">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border ${
                  assignment.status === 'DELIVERED'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-blue-600/90 text-white border-blue-400/40'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-stone-300 max-w-[80px] truncate">
                Delivery Spot
              </span>
            </div>
          </div>

          {/* Bottom Live Coordinate Bar */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800 pt-2 bg-stone-950/60 -mx-4 -mb-4 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {hasCoords
                  ? 'Real device GPS coordinates received'
                  : 'Waiting for partner GPS signal...'}
              </span>
            </div>

            {hasCoords && (
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
              >
                Inspect on Maps <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Informative Status Footer */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Last Location Ping: <strong className="text-stone-800">{lastUpdateText}</strong></span>
          </div>

          <span className="text-[11px] text-stone-500">
            Destination: <strong className="text-stone-700 truncate max-w-[160px] inline-block align-bottom">{customerAddressText}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
