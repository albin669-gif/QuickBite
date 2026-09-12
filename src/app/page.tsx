import { Navbar } from '@/components/navbar';
import { getCurrentUserProfile } from '@/actions/auth';
import { getActiveRestaurants } from '@/actions/restaurant';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Star,
  Clock,
  IndianRupee,
  ArrowRight,
  Sparkles,
  Flame,
  Store,
} from 'lucide-react';

export default async function HomePage() {
  const profile = await getCurrentUserProfile();
  const restaurants = await getActiveRestaurants();
  const featuredRestaurants = restaurants.slice(0, 3);

  const categories = [
    { name: 'Biryani', icon: '🍲', count: 'Dum Biryanis' },
    { name: 'North Indian', icon: '🍛', count: 'Curries & Gravies' },
    { name: 'South Indian', icon: '🥞', count: 'Crisp Dosas & Idlis' },
    { name: 'Street Food', icon: '🥟', count: 'Chaat & Snacks' },
    { name: 'Desserts', icon: '🍮', count: 'Mithai & Sweets' },
    { name: 'Tandoori', icon: '🍢', count: 'Charcoal Kebabs' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-8 sm:p-12 shadow-xl shadow-orange-500/20">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white mb-4">
              <Sparkles className="w-3.5 h-3.5" /> India&apos;s Fresh Flavor Delivery
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Authentic Indian Food, Delivered Hot & Fresh.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-orange-100 font-normal">
              Slow-cooked Dum Biryanis, Butter Chicken, Ghee Roast Dosas, and Bengali sweets from verified kitchen partners.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/restaurants">
                <Button size="lg" className="bg-white text-orange-700 hover:bg-orange-50 shadow-lg shadow-black/10">
                  Explore All Restaurants <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Cuisine Category Highlights */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600" />
                Explore by Flavor
              </h2>
              <p className="text-xs text-stone-500">Popular culinary categories across India</p>
            </div>
            <Link href="/restaurants" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              See all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/restaurants?cuisine=${encodeURIComponent(cat.name)}`}
                className="group bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-150 text-center flex flex-col items-center justify-center gap-2"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                  {cat.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-stone-400">{cat.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Restaurants Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Featured Partner Kitchens
              </h2>
              <p className="text-xs text-stone-500">Top-rated dining spots in Bangalore</p>
            </div>
            <Link href="/restaurants" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all ({restaurants.length}) &rarr;
            </Link>
          </div>

          {featuredRestaurants.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
              No restaurants currently published. Run seed script or add your kitchen via Partner Portal.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredRestaurants.map((restaurant) => (
                <Link
                  key={restaurant.id}
                  href={`/restaurant/${restaurant.id}`}
                  className="group bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-stone-100 overflow-hidden">
                      {restaurant.banner_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={restaurant.banner_url}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Store className="w-8 h-8" />
                        </div>
                      )}

                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur text-stone-900 text-[11px] font-bold shadow-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-600" />
                        <span>{restaurant.delivery_time_min}–{restaurant.delivery_time_max}m</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-stone-900 text-base group-hover:text-orange-600 transition-colors">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-extrabold shrink-0 border border-emerald-200">
                          <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          <span>{restaurant.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-stone-500 truncate">
                        {restaurant.cuisine_types.join(' • ')}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 bg-stone-50/50">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-stone-400" />
                      <span>Delivery: ₹{restaurant.delivery_fee.toFixed(0)}</span>
                    </div>
                    <span>Min ₹{restaurant.minimum_order.toFixed(0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Phase Status Badge for pair programmer transparency */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 text-stone-600 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Logged in as: <strong className="text-stone-900">{profile ? `${profile.full_name} (${profile.role})` : 'Guest'}</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
              Phase 1 &bull; Auth & RBAC
            </span>
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold uppercase">
              Phase 2 &bull; Restaurant & Menu
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
