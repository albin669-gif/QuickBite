'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, UtensilsCrossed, Tags, ShoppingBag, ArrowLeft, Bell, Star } from 'lucide-react';
import { clsx } from 'clsx';

export function RestaurantNav() {
  const pathname = usePathname();

  const links = [
    { href: '/restaurant/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/restaurant/menu', label: 'Menu Items', icon: UtensilsCrossed },
    { href: '/restaurant/categories', label: 'Categories', icon: Tags },
    { href: '/restaurant/profile', label: 'Restaurant Profile', icon: Store },
    { href: '/restaurant/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/restaurant/reviews', label: 'Customer Reviews', icon: Star },
    { href: '/notifications', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Partner Portal &bull; Verified Owner
          </span>
        </div>

        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/restaurant/dashboard' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
