'use client';

import React from 'react';
import type { OrderWithDetails } from '@/actions/order';
import Link from 'next/link';
import { ShoppingBag, Clock, Store, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  orders: OrderWithDetails[];
}

export function CustomerOrdersList({ orders }: Props) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">No orders yet</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          Looks like you haven&apos;t placed an order yet. Discover delicious food from top local restaurants!
        </p>
        <Link href="/restaurants" className="inline-block pt-2">
          <Button size="sm">Explore Restaurants</Button>
        </Link>
      </div>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PREPARING':
      case 'READY_FOR_PICKUP':
      case 'RESTAURANT_ACCEPTED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 hover:border-stone-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          {/* Order Meta & Restaurant */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-stone-900 text-base">
                #{order.order_number}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                  order.status
                )}`}
              >
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
              <Store className="w-3.5 h-3.5 text-stone-400" />
              <span>{order.restaurant?.name}</span>
            </div>

            <p className="text-xs text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date(order.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>

            {/* Dishes snippet */}
            <div className="text-xs text-stone-500 pt-1">
              {order.items?.map((item) => `${item.quantity}x ${item.item_name}`).join(', ')}
            </div>
          </div>

          {/* Amount & Track Action */}
          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
            <div className="text-left sm:text-right">
              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                Total Paid
              </p>
              <p className="text-lg font-extrabold text-stone-900">
                ₹{Number(order.total_amount).toFixed(2)}
              </p>
            </div>

            <Link href={`/orders/${order.id}`}>
              <Button size="sm" variant="outline" className="gap-1.5 group">
                <span>View & Track</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
