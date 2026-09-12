'use client';

import React, { useState } from 'react';
import type { AdminCustomerDetails } from '@/actions/admin';
import { toggleCustomerActive } from '@/actions/admin';
import { Users, Search, Mail, Phone, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initialCustomers: AdminCustomerDetails[];
}

export function AdminCustomersView({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<AdminCustomerDetails[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search))
  );

  async function handleToggle(customer: AdminCustomerDetails) {
    const nextState = !customer.is_active;
    const confirmMsg = nextState
      ? `Reactivate account for ${customer.full_name}?`
      : `Suspend account for ${customer.full_name}? They will be blocked from ordering.`;

    if (!confirm(confirmMsg)) return;

    setUpdatingId(customer.id);
    const res = await toggleCustomerActive(customer.id, nextState);
    if (!res.success) {
      alert(res.error || 'Failed to update customer status.');
    } else {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, is_active: nextState } : c))
      );
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Users className="w-6 h-6 text-orange-400" />
          Customer Directory ({filtered.length})
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Registered customer accounts, order history, and account moderation.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, email, or phone..."
          className="pl-10 bg-stone-900 border-stone-800 text-white placeholder:text-stone-500"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold">Orders & Spend</th>
                <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-500">
                    No customers found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-800/40 transition">
                    {/* Customer Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-white text-xs">
                          {c.full_name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{c.full_name}</p>
                          <p className="text-[10px] text-stone-500 capitalize">{c.role.toLowerCase()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        {c.email && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-stone-500" />
                            <span>{c.email}</span>
                          </p>
                        )}
                        {c.phone && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-500" />
                            <span>{c.phone}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Spend */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-bold text-white">{c.order_count} orders</span>
                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                          ₹{c.total_spent.toFixed(2)} total spend
                        </p>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-4 text-stone-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          c.is_active
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-red-950 text-red-400 border border-red-800/60'
                        }`}
                      >
                        {c.is_active ? (
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
                        variant={c.is_active ? 'danger' : 'outline'}
                        isLoading={updatingId === c.id}
                        onClick={() => handleToggle(c)}
                        className="text-xs"
                      >
                        {c.is_active ? 'Suspend' : 'Reactivate'}
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
