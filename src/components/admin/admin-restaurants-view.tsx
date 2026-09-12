'use client';

import React, { useState } from 'react';
import type { AdminRestaurantDetails } from '@/actions/admin';
import { toggleRestaurantActive } from '@/actions/admin';
import { Store, Search, ShieldAlert, CheckCircle2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initialRestaurants: AdminRestaurantDetails[];
}

export function AdminRestaurantsView({ initialRestaurants }: Props) {
  const [restaurants, setRestaurants] = useState<AdminRestaurantDetails[]>(initialRestaurants);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? r.is_active
        : !r.is_active;

    return matchesSearch && matchesStatus;
  });

  async function handleToggle(restaurant: AdminRestaurantDetails) {
    const nextState = !restaurant.is_active;
    const confirmMsg = nextState
      ? `Are you sure you want to reactivate ${restaurant.name}?`
      : `Are you sure you want to suspend ${restaurant.name}? It will no longer receive orders.`;

    if (!confirm(confirmMsg)) return;

    setUpdatingId(restaurant.id);
    const res = await toggleRestaurantActive(restaurant.id, nextState);
    if (!res.success) {
      alert(res.error || 'Failed to update restaurant status.');
    } else {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? { ...r, is_active: nextState } : r))
      );
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Store className="w-6 h-6 text-emerald-400" />
            Restaurant Partners ({filtered.length})
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Review partner kitchens, moderate approval status, and manage listings.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
          {(['all', 'active', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by restaurant, city, or owner..."
          className="pl-10 bg-stone-900 border-stone-800 text-white placeholder:text-stone-500"
        />
      </div>

      {/* Restaurants Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Restaurant</th>
                <th className="py-3.5 px-4 font-semibold">Owner Contact</th>
                <th className="py-3.5 px-4 font-semibold">Orders & GMV</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-stone-500">
                    No restaurants found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-800/40 transition">
                    {/* Restaurant Info */}
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-white text-sm">{r.name}</p>
                        <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-500" />
                          <span>{r.city}, {r.state}</span>
                        </p>
                        <p className="text-[10px] text-purple-400 mt-1">
                          {r.cuisine_types?.join(', ') || 'Indian'}
                        </p>
                      </div>
                    </td>

                    {/* Owner Contact */}
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-white">{r.owner?.full_name || 'Partner'}</p>
                        {r.owner?.email && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-stone-500" />
                            <span>{r.owner.email}</span>
                          </p>
                        )}
                        {r.phone && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-stone-500" />
                            <span>{r.phone}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Volume & GMV */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-bold text-white">{r.order_count} orders</span>
                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                          ₹{r.total_revenue.toFixed(2)} GMV
                        </p>
                        <p className="text-[10px] text-stone-500">Rating: ★ {r.rating.toFixed(1)}</p>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          r.is_active
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-red-950 text-red-400 border border-red-800/60'
                        }`}
                      >
                        {r.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3 h-3" />
                            <span>Suspended</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        variant={r.is_active ? 'danger' : 'outline'}
                        isLoading={updatingId === r.id}
                        onClick={() => handleToggle(r)}
                        className="text-xs"
                      >
                        {r.is_active ? 'Suspend' : 'Reactivate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
