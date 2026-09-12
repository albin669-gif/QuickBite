'use client';

import React, { useState } from 'react';
import type { DeliveryAssignment } from '@/types/database.types';
import {
  Search,
  ExternalLink,
  Phone,
  Radio,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AssignmentWithMeta extends DeliveryAssignment {
  order_number: string;
  restaurant_name: string;
  customer_name: string;
}

interface Props {
  initialAssignments: AssignmentWithMeta[];
}

export function AdminDeliveriesView({ initialAssignments }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredAssignments = initialAssignments.filter((a) => {
    const matchesSearch =
      (a.order_number && a.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.driver_name && a.driver_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.restaurant_name && a.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.customer_name && a.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || a.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Delivery Fleet Operations
          </h1>
          <p className="text-xs text-stone-500">
            Real-time tracking of active drivers, GPS coordinates, and delivery tasks
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => router.refresh()}
          className="gap-1.5 text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Fleet
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, driver name, kitchen, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-700 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="ALL">All Delivery Statuses</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="ARRIVED_AT_RESTAURANT">Arrived at Kitchen</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* Fleet Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Driver Partner</th>
                <th className="p-4">Kitchen</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Status</th>
                <th className="p-4">Live GPS Position</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400">
                    No delivery records match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const hasGps =
                    typeof a.current_latitude === 'number' &&
                    typeof a.current_longitude === 'number';

                  return (
                    <tr key={a.id} className="hover:bg-stone-50/60 transition">
                      <td className="p-4 font-bold text-stone-900">
                        #{a.order_number}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-stone-900">
                          {a.driver_name || 'Unassigned'}
                        </div>
                        {a.driver_phone && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {a.driver_phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-stone-800">
                          {a.restaurant_name}
                        </span>
                      </td>
                      <td className="p-4 text-stone-700 font-medium">
                        {a.customer_name}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                            a.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        {hasGps ? (
                          <div className="space-y-0.5 font-mono text-[11px] text-stone-700">
                            <div className="flex items-center gap-1">
                              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                              <span>
                                {a.current_latitude?.toFixed(4)}, {a.current_longitude?.toFixed(4)}
                              </span>
                            </div>
                            {a.heading !== null && a.heading !== undefined && (
                              <div className="text-[10px] text-stone-400 flex items-center gap-1 font-sans">
                                <Compass className="w-3 h-3 text-orange-500" />
                                Heading {Math.round(a.heading)}°
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">No GPS signal</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {hasGps ? (
                          <a
                            href={`https://www.google.com/maps?q=${a.current_latitude},${a.current_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold"
                          >
                            Inspect <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
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
