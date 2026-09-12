import { getAdminMetrics } from '@/actions/admin';
import {
  Users,
  Store,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const metrics = await getAdminMetrics('all');

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Platform Command Center
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Real-time analytics and platform performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Master Admin Authorized</span>
          </span>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span>Gross Order Value (GMV)</span>
            <IndianRupee className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            ₹{metrics?.grossOrderValue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Total customer spend</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span>Platform Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
            ₹{metrics?.platformRevenue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">15% commission on food</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span>Restaurant Earnings</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            ₹{metrics?.restaurantEarnings?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Net partner payout pool</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span>Average Order Value</span>
            <IndianRupee className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            ₹{metrics?.averageOrderValue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Per completed order</p>
        </div>
      </div>

      {/* Operational Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/orders"
          className="bg-stone-900 border border-stone-800 hover:border-purple-600/50 p-5 rounded-2xl transition group block"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span className="group-hover:text-purple-400 transition">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-extrabold text-white">{metrics?.totalOrders || 0}</p>
            <span className="text-xs text-stone-400">({metrics?.todayOrders || 0} today)</span>
          </div>
          <p className="text-[11px] text-purple-400 mt-1 flex items-center gap-1">
            <span>Manage orders</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </Link>

        <Link
          href="/admin/restaurants"
          className="bg-stone-900 border border-stone-800 hover:border-emerald-600/50 p-5 rounded-2xl transition group block"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span className="group-hover:text-emerald-400 transition">Restaurants</span>
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-extrabold text-white">{metrics?.totalRestaurants || 0}</p>
            <span className="text-xs text-emerald-400">({metrics?.activeRestaurants || 0} active)</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>View & moderate</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </Link>

        <Link
          href="/admin/customers"
          className="bg-stone-900 border border-stone-800 hover:border-orange-600/50 p-5 rounded-2xl transition group block"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span className="group-hover:text-orange-400 transition">Customers</span>
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-extrabold text-white">{metrics?.totalCustomers || 0}</p>
            <span className="text-xs text-stone-400">registered</span>
          </div>
          <p className="text-[11px] text-orange-400 mt-1 flex items-center gap-1">
            <span>Customer directory</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </Link>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span>Order Fulfillment</span>
            <Clock className="w-4 h-4 text-stone-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-extrabold text-white">{metrics?.deliveredOrders || 0}</p>
            <span className="text-xs text-stone-400">delivered</span>
          </div>
          <p className="text-[11px] text-red-400 mt-1">
            {metrics?.cancelledOrders || 0} cancellations
          </p>
        </div>
      </div>
    </div>
  );
}
