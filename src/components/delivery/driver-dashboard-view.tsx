'use client';

import React, { useState } from 'react';
import type {
  DriverDeliveryDetails,
  AvailableOrderForDelivery,
} from '@/actions/delivery';
import {
  claimDeliveryOrderAction,
  updateDeliveryStatusAction,
} from '@/actions/delivery';
import type { DeliveryStatus } from '@/types/database.types';
import { DriverLocationBroadcaster } from './driver-location-broadcaster';
import {
  Bike,
  MapPin,
  Phone,
  Store,
  Navigation,
  CheckCircle,
  Package,
  Clock,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Props {
  initialActiveDelivery: DriverDeliveryDetails | null;
  initialAvailableOrders: AvailableOrderForDelivery[];
  driverName: string;
}

export function DriverDashboardView({
  initialActiveDelivery,
  initialAvailableOrders,
  driverName,
}: Props) {
  const router = useRouter();
  const [activeDelivery, setActiveDelivery] = useState<DriverDeliveryDetails | null>(
    initialActiveDelivery
  );
  const [availableOrders, setAvailableOrders] = useState<AvailableOrderForDelivery[]>(
    initialAvailableOrders
  );
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClaim(orderId: string) {
    setClaimingId(orderId);
    setErrorMsg(null);

    const res = await claimDeliveryOrderAction(orderId);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to claim delivery order.');
      setClaimingId(null);
    } else {
      router.refresh();
      // Remove from available and re-render
      setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
      setClaimingId(null);
    }
  }

  async function handleUpdateStatus(newStatus: DeliveryStatus) {
    if (!activeDelivery) return;
    setUpdatingStatus(true);
    setErrorMsg(null);

    const res = await updateDeliveryStatusAction(activeDelivery.order_id, newStatus);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update delivery status.');
    } else {
      if (newStatus === 'DELIVERED') {
        setActiveDelivery(null);
      } else {
        setActiveDelivery((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
              }
            : null
        );
      }
      router.refresh();
    }
    setUpdatingStatus(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white p-6 rounded-3xl shadow-md border border-stone-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Delivery Partner Portal</h1>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-400/30 px-2 py-0.5 rounded-full font-bold">
                Online
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Welcome back, <span className="font-semibold text-white">{driverName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.refresh()}
            className="text-stone-300 border-stone-700 hover:text-white hover:bg-stone-800 gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* SECTION 1: Active In-Progress Delivery */}
      {activeDelivery ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Active Delivery Task #{activeDelivery.order.order_number}
            </h2>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-extrabold tracking-wide uppercase">
              {activeDelivery.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Real Device Location Broadcaster */}
          <DriverLocationBroadcaster
            orderId={activeDelivery.order_id}
            isActive={activeDelivery.status !== 'DELIVERED'}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Restaurant Pickup Card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-orange-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Store className="w-4 h-4" /> 1. Pickup from Kitchen
                </span>
                {activeDelivery.order.restaurant.phone && (
                  <a
                    href={`tel:${activeDelivery.order.restaurant.phone}`}
                    className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Kitchen
                  </a>
                )}
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  {activeDelivery.order.restaurant.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {activeDelivery.order.restaurant.address}, {activeDelivery.order.restaurant.city}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <p className="text-[11px] font-bold text-stone-700 mb-2">Order Items to Pick:</p>
                <div className="space-y-1 text-xs text-stone-600">
                  {activeDelivery.order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.item_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation button */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${activeDelivery.order.restaurant.name}, ${activeDelivery.order.restaurant.address}, ${activeDelivery.order.restaurant.city}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs font-bold">
                  <Navigation className="w-3.5 h-3.5 text-orange-600" /> Open Restaurant in Google Maps
                </Button>
              </a>
            </div>

            {/* Step 2: Customer Destination Card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-4 h-4" /> 2. Deliver to Customer
                </span>
                {activeDelivery.order.customer.phone && (
                  <a
                    href={`tel:${activeDelivery.order.customer.phone}`}
                    className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Customer
                  </a>
                )}
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  {activeDelivery.order.customer.full_name}
                </h3>
                <p className="text-xs text-stone-700 font-medium mt-1">
                  {activeDelivery.order.delivery_address_snapshot.address_line1}
                </p>
                {activeDelivery.order.delivery_address_snapshot.landmark && (
                  <p className="text-xs text-stone-500">
                    Landmark: {activeDelivery.order.delivery_address_snapshot.landmark}
                  </p>
                )}
                <p className="text-xs text-stone-500">
                  {activeDelivery.order.delivery_address_snapshot.city} -{' '}
                  {activeDelivery.order.delivery_address_snapshot.postal_code}
                </p>
              </div>

              {activeDelivery.order.customer_notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold">Note from Customer:</span>{' '}
                  {activeDelivery.order.customer_notes}
                </div>
              )}

              {/* Navigation button */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${activeDelivery.order.delivery_address_snapshot.address_line1}, ${activeDelivery.order.delivery_address_snapshot.city} ${activeDelivery.order.delivery_address_snapshot.postal_code}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs font-bold">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" /> Open Destination in Google Maps
                </Button>
              </a>
            </div>
          </div>

          {/* Lifecycle Action Progression Bar */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900">Delivery Status Actions</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeDelivery.status === 'ASSIGNED' && (
                <Button
                  onClick={() => handleUpdateStatus('ARRIVED_AT_RESTAURANT')}
                  isLoading={updatingStatus}
                  variant="primary"
                  className="w-full gap-2 font-bold text-xs"
                >
                  <Store className="w-4 h-4" /> 1. I&apos;ve Arrived at Kitchen
                </Button>
              )}

              {(activeDelivery.status === 'ASSIGNED' ||
                activeDelivery.status === 'ARRIVED_AT_RESTAURANT') && (
                <Button
                  onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
                  isLoading={updatingStatus}
                  variant="primary"
                  className="w-full gap-2 font-bold text-xs bg-orange-600 hover:bg-orange-700"
                >
                  <Package className="w-4 h-4" /> 2. Picked Up Food &amp; On the Way
                </Button>
              )}

              {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                <Button
                  onClick={() => handleUpdateStatus('DELIVERED')}
                  isLoading={updatingStatus}
                  variant="primary"
                  className="w-full gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="w-4 h-4" /> 3. Order Delivered to Customer
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-emerald-50/60 rounded-3xl border border-emerald-200 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-emerald-950">Ready for Next Assignment</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            You currently have no active deliveries. Browse the available orders below and accept one to begin.
          </p>
        </div>
      )}

      {/* SECTION 2: Available Delivery Orders to Claim */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Available Orders to Pick Up</h2>
            <p className="text-xs text-stone-500">
              Freshly confirmed and cooked orders ready in your area
            </p>
          </div>
          <span className="text-xs font-extrabold bg-stone-100 text-stone-800 px-3 py-1 rounded-full">
            {availableOrders.length} Available
          </span>
        </div>

        {availableOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
            <Clock className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-bold text-stone-700">No Orders Currently Waiting</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Check back in a few moments as kitchens confirm and pack new incoming customer orders.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm hover:border-orange-300 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">
                      #{order.order_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        order.status === 'READY_FOR_PICKUP'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status === 'READY_FOR_PICKUP' ? 'Food Ready' : 'In Kitchen'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                      <Store className="w-3.5 h-3.5 text-orange-600" />
                      {order.restaurant.name}
                    </div>
                    <p className="text-[11px] text-stone-500 ml-5">
                      {order.restaurant.address}, {order.restaurant.city}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Deliver to:
                    </div>
                    <p className="text-[11px] text-stone-500 ml-5">
                      {order.delivery_address_snapshot.address_line1},{' '}
                      {order.delivery_address_snapshot.city}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                    <span>{order.item_count} items</span>
                    <span className="font-extrabold text-stone-900 flex items-center">
                      <IndianRupee className="w-3 h-3" />
                      {order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleClaim(order.id)}
                  isLoading={claimingId === order.id}
                  disabled={activeDelivery !== null}
                  variant="primary"
                  size="sm"
                  className="w-full gap-1.5 font-bold text-xs"
                >
                  {activeDelivery !== null
                    ? 'Complete Active Delivery First'
                    : 'Accept & Start Delivery'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
