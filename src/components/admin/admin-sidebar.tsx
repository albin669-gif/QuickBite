'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Tags,
  Settings,
  BarChart3,
  LogOut,
  ExternalLink,
  Shield,
  Bike,
} from 'lucide-react';
import { signOutAction } from '@/actions/auth';
import { clsx } from 'clsx';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/deliveries', label: 'Fleet & Deliveries', icon: Bike },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/coupons', label: 'Coupons', icon: Tags },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-stone-950 border-r border-stone-800 text-stone-300 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight">QuickBite</h1>
            <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
              Admin Console
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                    : 'text-stone-400 hover:text-white hover:bg-stone-900'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-stone-800 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-900 transition"
        >
          <span>Storefront</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
