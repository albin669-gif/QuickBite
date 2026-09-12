'use client';

import React, { useState } from 'react';
import type { AdminOrderRow } from '@/actions/admin';
import type { OrderStatus } from '@/types/database.types';
import { ShoppingBag, Search, ExternalLink, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Props {
  initialOrders: AdminOrderRow[];
}

export function AdminOrdersView({ initialOrders }: Props) {
  const [orders] = useState<AdminOrderRow[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.restaurant?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800/60';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-950 text-red-400 border-red-800/60';
      case 'OUT_FOR_DELIVERY':
        return 'bg-blue-950 text-blue-400 border-blue-800/60';
      case 'PREPARING':
      case 'READY_FOR_PICKUP':
      case 'RESTAURANT_ACCEPTED':
        return 'bg-amber-950 text-amber-400 border-amber-800/60';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-purple-400" />
            Global Order Management ({filtered.length})
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Real-time multi-restaurant order pipeline and customer fulfillment oversight.
          </p>
        </div>

        {/* Status Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
          className="bg-stone-900 border border-stone-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="PAID">Paid</option>
          <option value="RESTAURANT_ACCEPTED">Restaurant Accepted</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order #, customer, or restaurant..."
          className="pl-10 bg-stone-900 border-stone-800 text-white placeholder:text-stone-500"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Order</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Restaurant</th>
                <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-500">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const addr = (o.delivery_address_snapshot as any) || {};

                  return (
                    <tr key={o.id} className="hover:bg-stone-800/40 transition">
                      {/* Order Number */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-bold text-white text-sm">#{o.order_number}</span>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {new Date(o.created_at).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                          <span className="text-[10px] text-purple-400 font-medium">
                            {o.items_count} items
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-white">{o.customer?.full_name || 'Guest'}</p>
                          <p className="text-[11px] text-stone-400">{o.customer?.phone || o.customer?.email}</p>
                          <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{addr.address_line1}, {addr.city}</span>
                          </p>
                        </div>
                      </td>

                      {/* Restaurant */}
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-white">{o.restaurant?.name}</p>
                          <p className="text-[10px] text-stone-500">{o.restaurant?.city}</p>
                        </div>
                      </td>

                      {/* Financial Total */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-bold text-white text-sm">
                            ₹{Number(o.total_amount).toFixed(2)}
                          </span>
                          <p className="text-[10px] text-stone-500">
                            Subtotal: ₹{Number(o.subtotal).toFixed(2)}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${getStatusBadge(
                            o.status
                          )}`}
                        >
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Details Link */}
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/orders/${o.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-semibold text-xs transition"
                        >
                          <span>Track</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
