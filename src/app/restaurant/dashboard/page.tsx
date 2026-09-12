import { getCurrentUserProfile, signOutAction } from '@/actions/auth';
import { getOwnerRestaurant, getMenuCategories, getMenuItems } from '@/actions/restaurant';
import { getRestaurantOrders } from '@/actions/order';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { AcceptingToggle } from '@/components/restaurant/accepting-toggle';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  UtensilsCrossed,
  Tags,
  IndianRupee,
  Star,
  Plus,
  ExternalLink,
  LogOut,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export default async function RestaurantDashboardPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/dashboard');
  }

  if (profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-stone-600">Setting up your restaurant profile...</p>
        </div>
      </div>
    );
  }

  const categories = await getMenuCategories(restaurant.id);
  const items = await getMenuItems(restaurant.id);
  const availableItems = items.filter((i) => i.is_available);
  const restaurantOrders = await getRestaurantOrders(restaurant.id);
  const activeOrders = restaurantOrders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED'
  );

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Restaurant Header */}
      <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {restaurant.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-12 h-12 rounded-xl object-cover border border-stone-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">{restaurant.name}</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {restaurant.city || 'Bangalore'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Partner Dashboard &bull; {restaurant.cuisine_types?.join(', ') || 'Indian'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Accepting Orders Live Toggle */}
          <AcceptingToggle
            restaurantId={restaurant.id}
            initialAccepting={restaurant.is_accepting_orders}
          />

          <Link href={`/restaurant/${restaurant.id}`} target="_blank">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Storefront
            </Button>
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign Out"
              className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Navigation Tabs */}
      <RestaurantNav />

      {/* Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/restaurant/orders"
            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:border-orange-300 transition group block"
          >
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span className="group-hover:text-orange-600 transition">Active Orders</span>
              <ShoppingBag className="w-4 h-4 text-orange-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-stone-900">{activeOrders.length}</span>
              <span className="text-xs text-orange-600 font-semibold">Live in kitchen</span>
            </div>
          </Link>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Total Dishes</span>
              <UtensilsCrossed className="w-4 h-4 text-orange-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-stone-900">{items.length}</span>
              <span className="text-xs text-emerald-600 font-medium">({availableItems.length} in stock)</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Menu Categories</span>
              <Tags className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-stone-900 mt-2">{categories.length}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Average Rating</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-stone-900">{restaurant.rating.toFixed(1)}</span>
              <span className="text-xs text-stone-500">({restaurant.total_reviews} reviews)</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Delivery Fee</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xs text-stone-500 font-semibold">₹</span>
              <span className="text-3xl font-bold text-stone-900">{restaurant.delivery_fee}</span>
              <span className="text-[11px] text-stone-400 ml-1">Min ₹{restaurant.minimum_order}</span>
            </div>
          </div>
        </div>

        {/* Action Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Menu Manager Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">Menu Overview</h2>
                <p className="text-xs text-stone-500">Add dishes, update prices, or organize your categories.</p>
              </div>
              <Link href="/restaurant/menu/new">
                <Button size="sm" variant="primary">
                  <Plus className="w-4 h-4 mr-1" /> Add Dish
                </Button>
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-stone-50 border border-dashed border-stone-300">
                <UtensilsCrossed className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-700">No dishes on your menu yet</p>
                <p className="text-xs text-stone-500 mt-1 mb-4">Add your culinary items to start receiving orders.</p>
                <Link href="/restaurant/menu/new">
                  <Button size="sm">Create First Menu Item</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {items.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        title={item.is_veg ? 'Pure Veg' : 'Non-Veg'}
                      />
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                        <p className="text-xs text-stone-500">₹{item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <Link href={`/restaurant/menu/edit/${item.id}`}>
                      <span className="text-xs text-stone-500 hover:text-emerald-700 font-medium">Edit</span>
                    </Link>
                  </div>
                ))}
                <div className="pt-3 text-right">
                  <Link href="/restaurant/menu" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                    View all {items.length} items &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Operating Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Restaurant Details</h2>
                  <p className="text-xs text-stone-500">Address, opening hours, and delivery policies.</p>
                </div>
                <Link href="/restaurant/profile">
                  <Button size="sm" variant="outline">
                    Edit Profile
                  </Button>
                </Link>
              </div>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Kitchen Address:</span>
                  <span className="font-medium text-stone-900 text-right">{restaurant.address}, {restaurant.city}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Phone Contact:</span>
                  <span className="font-medium text-stone-900">{restaurant.phone || 'Not configured'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Estimated Delivery:</span>
                  <span className="font-medium text-stone-900">{restaurant.delivery_time_min} - {restaurant.delivery_time_max} mins</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-500">Storefront Status:</span>
                  <span className="font-bold text-emerald-600">
                    {restaurant.is_active ? 'Active & Listed in Bangalore' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Preview your live customer menu at <Link href={`/restaurant/${restaurant.id}`} className="underline font-bold" target="_blank">/restaurant/{restaurant.id}</Link></span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
