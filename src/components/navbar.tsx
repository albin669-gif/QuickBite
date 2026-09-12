import Link from 'next/link';
import { getCurrentUserProfile, signOutAction } from '@/actions/auth';
import { getCart } from '@/actions/cart';
import { getUnreadNotificationCount } from '@/actions/notification';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Utensils, ShoppingBag, Shield, Store, LogOut, Search, Bike } from 'lucide-react';
import { Button } from './ui/button';

export async function Navbar() {
  const profile = await getCurrentUserProfile();
  let cartItemCount = 0;
  let unreadNotificationCount = 0;

  if (profile) {
    unreadNotificationCount = await getUnreadNotificationCount();
    if (profile.role === 'CUSTOMER') {
      const cart = await getCart();
      cartItemCount = cart?.item_count || 0;
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform duration-200">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-stone-900">
              Quick<span className="text-orange-600">Bite</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-orange-100 text-orange-800 rounded">
              India
            </span>
          </div>
        </Link>

        {/* Global Navigation Search & Links */}
        <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
          <Link
            href="/restaurants"
            className="text-stone-600 hover:text-orange-600 transition-colors"
          >
            All Restaurants
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
          >
            <Search className="w-3.5 h-3.5 text-stone-500" />
            <span>Search Dishes...</span>
          </Link>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Icon */}
          <Link
            href="/search"
            className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
            title="Search dishes"
          >
            <Search className="w-5 h-5" />
          </Link>

          {profile ? (
            <div className="flex items-center gap-4">
              {/* Role Indicator & Shortcuts */}
              {profile.role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

              {profile.role === 'RESTAURANT_OWNER' && (
                <Link
                  href="/restaurant/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                >
                  <Store className="w-3.5 h-3.5" />
                  Partner Portal
                </Link>
              )}

              {profile.role === 'DELIVERY_PARTNER' && (
                <Link
                  href="/driver/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
                >
                  <Bike className="w-3.5 h-3.5" />
                  Driver Portal
                </Link>
              )}

              {profile.role === 'CUSTOMER' && (
                <>
                  <Link
                    href="/orders"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">Orders</span>
                  </Link>
                  <Link
                    href="/cart"
                    className="relative inline-flex items-center justify-center p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    aria-label="View Shopping Cart"
                  >
                    <ShoppingBag className="w-5 h-5 text-orange-600" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* In-App Notification Bell */}
              <NotificationBell
                userId={profile.id}
                initialUnreadCount={unreadNotificationCount}
              />

              {/* User dropdown profile info */}
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-semibold text-xs">
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-stone-900 truncate max-w-[120px]">
                    {profile.full_name}
                  </p>
                  <p className="text-[10px] text-stone-500 capitalize">{profile.role.toLowerCase()}</p>
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/restaurant/login"
                className="hidden sm:inline-flex items-center text-xs font-medium text-stone-600 hover:text-orange-600 transition-colors"
              >
                Restaurant Partner?
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
