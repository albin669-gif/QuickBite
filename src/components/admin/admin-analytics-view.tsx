'use client';

import React, { useState } from 'react';
import type { AdminMetrics } from '@/actions/admin';
import { getAdminMetrics } from '@/actions/admin';
import {
  BarChart3,
  Calendar,
  ShoppingBag,
  Store,
  RefreshCw,
} from 'lucide-react';

interface Props {
  initialMetrics: AdminMetrics | null;
}

export function AdminAnalyticsView({ initialMetrics }: Props) {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(initialMetrics);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [loading, setLoading] = useState(false);

  async function handleRangeChange(range: 'today' | '7days' | '30days' | 'all') {
    setTimeRange(range);
    setLoading(true);
    const updated = await getAdminMetrics(range);
    if (updated) {
      setMetrics(updated);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Platform Business Analytics
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Authoritative financial aggregates computed directly from Supabase PostgreSQL records.
          </p>
        </div>

        {/* Temporal Filter Selector */}
        <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800">
          <Calendar className="w-3.5 h-3.5 text-stone-500 ml-2" />
          {[
            { key: 'today', label: 'Today' },
            { key: '7days', label: 'Last 7 Days' },
            { key: '30days', label: 'Last 30 Days' },
            { key: 'all', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleRangeChange(item.key as 'today' | '7days' | '30days' | 'all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timeRange === item.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>Refreshing platform metrics from database...</span>
        </div>
      )}

      {/* Main Aggregates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400">Total Order Volume (GMV)</span>
          <p className="text-3xl font-extrabold text-white mt-2">
            ₹{metrics?.grossOrderValue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Total revenue generated through platform</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400">Platform Revenue (15%)</span>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">
            ₹{metrics?.platformRevenue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Platform service fee retainage</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400">Restaurant Net Payouts</span>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">
            ₹{metrics?.restaurantEarnings?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Net partner food earnings</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400">Average Order Value (AOV)</span>
          <p className="text-3xl font-extrabold text-blue-400 mt-2">
            ₹{metrics?.averageOrderValue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Mean customer basket size</p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Order Fulfillment Breakdown */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            Order Fulfillment Breakdown
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-stone-300 pb-2 border-b border-stone-800">
              <span>Total Processed Orders</span>
              <span className="font-bold text-white">{metrics?.totalOrders || 0}</span>
            </div>
            <div className="flex justify-between text-stone-300 pb-2 border-b border-stone-800">
              <span>Successfully Delivered Orders</span>
              <span className="font-bold text-emerald-400">{metrics?.deliveredOrders || 0}</span>
            </div>
            <div className="flex justify-between text-stone-300 pb-2 border-b border-stone-800">
              <span>Cancelled / Refunded Orders</span>
              <span className="font-bold text-red-400">{metrics?.cancelledOrders || 0}</span>
            </div>
          </div>
        </div>

        {/* Network Scale */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            Network Scale & Partner Health
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-stone-300 pb-2 border-b border-stone-800">
              <span>Total Registered Customers</span>
              <span className="font-bold text-white">{metrics?.totalCustomers || 0}</span>
            </div>
            <div className="flex justify-between text-stone-300 pb-2 border-b border-stone-800">
              <span>Active Partner Restaurants</span>
              <span className="font-bold text-emerald-400">{metrics?.activeRestaurants || 0}</span>
            </div>
            <div className="flex justify-between text-stone-300 pb-2 border-b border-stone-800">
              <span>Suspended Partner Restaurants</span>
              <span className="font-bold text-amber-400">{metrics?.suspendedRestaurants || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
