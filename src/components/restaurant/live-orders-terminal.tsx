'use client';

import React, { useState, useEffect } from 'react';
import type { OrderWithDetails } from '@/actions/order';
import { updateOrderStatusAction, getOrderById } from '@/actions/order';
import { createClient } from '@/lib/supabase/client';
import type { OrderStatus } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Bike,
  MapPin,
  FileText,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  initialOrders: OrderWithDetails[];
  restaurantId: string;
}

export function LiveOrdersTerminal({ initialOrders, restaurantId }: Props) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<'incoming' | 'preparing' | 'delivery' | 'completed'>('incoming');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Supabase Realtime Subscription for Restaurant Orders
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`restaurant-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // New order placed in real-time! Fetch full joined details
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newOrderId = (payload.new as any).id;
            const fullOrder = await getOrderById(newOrderId);
            if (fullOrder) {
              setOrders((prev) => {
                if (prev.some((o) => o.id === fullOrder.id)) return prev;
                return [fullOrder, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Order updated in real-time
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updated = payload.new as any;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id
                  ? {
                      ...o,
                      status: updated.status || o.status,
                      rejection_reason: updated.rejection_reason || o.rejection_reason,
                      updated_at: updated.updated_at || o.updated_at,
                    }
                  : o
              )
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // Group orders into operational categories
  const incomingOrders = orders.filter(
    (o) => o.status === 'PENDING_PAYMENT' || o.status === 'PAID' || o.status === 'RESTAURANT_ACCEPTED'
  );
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const deliveryOrders = orders.filter(
    (o) => o.status === 'READY_FOR_PICKUP' || o.status === 'OUT_FOR_DELIVERY'
  );
  const completedOrders = orders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'REFUNDED'
  );

  const displayedOrders =
    activeTab === 'incoming'
      ? incomingOrders
      : activeTab === 'preparing'
      ? preparingOrders
      : activeTab === 'delivery'
      ? deliveryOrders
      : completedOrders;

  async function handleUpdateStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    setErrorMsg(null);

    let rejectionReason: string | undefined = undefined;
    if (nextStatus === 'CANCELLED') {
      const reason = prompt('Please enter rejection or cancellation reason:');
      if (!reason) {
        setUpdatingId(null);
        return;
      }
      rejectionReason = reason;
    }

    const res = await updateOrderStatusAction(orderId, nextStatus, rejectionReason);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update order status.');
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: nextStatus, rejection_reason: rejectionReason || o.rejection_reason }
            : o
        )
      );
    }

    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Realtime Terminal Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              connectionStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : connectionStatus === 'connecting'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}
          >
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Realtime Live Feed Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-stone-400" />
                <span>Connecting Realtime Feed...</span>
              </>
            )}
          </span>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Reload Feed</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs / Queue Filter */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'incoming'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <span>Incoming Orders</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'incoming' ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {incomingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('preparing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'preparing'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <span>Kitchen Preparing</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'preparing' ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {preparingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'delivery'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <span>Ready & Dispatched</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'delivery' ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {deliveryOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <span>History & Cancelled</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'completed' ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {completedOrders.length}
          </span>
        </button>
      </div>

      {/* Orders Terminal Cards */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No orders in this queue</h3>
          <p className="text-xs text-stone-500">
            {activeTab === 'incoming'
              ? 'Incoming orders placed by customers will appear here in real-time.'
              : 'No orders currently matching this stage.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedOrders.map((order) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const addr = (order.delivery_address_snapshot as any) || {};
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between space-y-5 hover:border-stone-300 transition"
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <span className="font-extrabold text-stone-900 text-base">
                        #{order.order_number}
                      </span>
                      <p className="text-[11px] text-stone-400">
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Customer Delivery Snapshot */}
                  <div className="text-xs text-stone-600 space-y-0.5 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                    <p className="font-bold text-stone-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{addr.address_line1}</span>
                    </p>
                    {addr.landmark && (
                      <p className="text-[11px] text-stone-400 pl-5">Near {addr.landmark}</p>
                    )}
                    <p className="text-[11px] text-stone-400 pl-5">
                      {addr.city} - {addr.postal_code}
                    </p>
                  </div>

                  {/* Cooking Instructions if provided */}
                  {order.customer_notes && (
                    <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <FileText className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <span className="font-bold">Customer Cooking Note:</span>
                        <p className="mt-0.5">{order.customer_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="divide-y divide-stone-100">
                    {order.items?.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">
                            {item.quantity}x
                          </span>
                          <span className="font-medium text-stone-800">{item.item_name}</span>
                        </div>
                        <span className="font-semibold text-stone-600">
                          ₹{item.total_price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bill Total & Payment Method */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-700">Total Bill Value</span>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-stone-900 block">
                        ₹{Number(order.total_amount).toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          order.payment?.error_description === 'CASH_ON_DELIVERY'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : order.payment?.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {order.payment?.error_description === 'CASH_ON_DELIVERY'
                          ? 'Cash on Delivery'
                          : order.payment?.status === 'SUCCESS'
                          ? 'Paid via Razorpay'
                          : 'Online Payment Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    target="_blank"
                    className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
                  >
                    View Customer View &rarr;
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Incoming state -> Accept or Reject */}
                    {(order.status === 'PENDING_PAYMENT' ||
                      order.status === 'PAID' ||
                      order.status === 'RESTAURANT_ACCEPTED') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          isLoading={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className="text-xs"
                        >
                          Start Cooking
                        </Button>
                      </>
                    )}

                    {/* Preparing -> Ready for Pickup */}
                    {order.status === 'PREPARING' && (
                      <Button
                        size="sm"
                        isLoading={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                        className="text-xs"
                      >
                        <PackageCheck className="w-3.5 h-3.5 mr-1" />
                        Food is Ready
                      </Button>
                    )}

                    {/* Ready -> Out for Delivery */}
                    {order.status === 'READY_FOR_PICKUP' && (
                      <Button
                        size="sm"
                        isLoading={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                        className="text-xs"
                      >
                        <Bike className="w-3.5 h-3.5 mr-1" />
                        Hand Over to Rider
                      </Button>
                    )}

                    {/* Out for Delivery -> Delivered */}
                    {order.status === 'OUT_FOR_DELIVERY' && (
                      <Button
                        size="sm"
                        isLoading={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
