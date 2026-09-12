import { Navbar } from '@/components/navbar';
import { getActiveRestaurantsWithStatus, RestaurantFilterParams } from '@/actions/restaurant';
import Link from 'next/link';
import {
  Star,
  Clock,
  IndianRupee,
  Search,
  Store,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ChefHat,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';

export default async function RestaurantsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    cuisine?: string;
    q?: string;
    veg?: string;
    minRating?: string;
    open?: string;
    maxDeliveryFee?: string;
    sortBy?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const activeCuisine = resolvedParams.cuisine || 'All';
  const searchQuery = resolvedParams.q || '';
  const isVegOnly = resolvedParams.veg === 'true';
  const minRating = resolvedParams.minRating ? parseFloat(resolvedParams.minRating) : undefined;
  const isOpenNow = resolvedParams.open === 'true';
  const maxDeliveryFee = resolvedParams.maxDeliveryFee ? parseFloat(resolvedParams.maxDeliveryFee) : undefined;
  const sortBy = (resolvedParams.sortBy || 'recommended') as RestaurantFilterParams['sortBy'];

  const filterParams: RestaurantFilterParams = {
    search: searchQuery,
    cuisine: activeCuisine,
    vegOnly: isVegOnly,
    minRating: minRating,
    openNow: isOpenNow,
    maxDeliveryFee: maxDeliveryFee,
    sortBy: sortBy,
  };

  const { restaurants, error: dbError, isFallback } = await getActiveRestaurantsWithStatus(filterParams);

  const popularCuisines = [
    'All',
    'Biryani',
    'North Indian',
    'South Indian',
    'Street Food',
    'Desserts',
    'Tandoori',
  ];

  // Helper to build URL with updated params
  function buildFilterUrl(newParams: Record<string, string | null>) {
    const current: Record<string, string> = {};
    if (searchQuery) current.q = searchQuery;
    if (activeCuisine !== 'All') current.cuisine = activeCuisine;
    if (isVegOnly) current.veg = 'true';
    if (minRating) current.minRating = String(minRating);
    if (isOpenNow) current.open = 'true';
    if (maxDeliveryFee) current.maxDeliveryFee = String(maxDeliveryFee);
    if (sortBy && sortBy !== 'recommended') current.sortBy = sortBy;

    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null) {
        delete current[k];
      } else {
        current[k] = v;
      }
    });

    const queryStr = new URLSearchParams(current).toString();
    return queryStr ? `/restaurants?${queryStr}` : '/restaurants';
  }

  const hasActiveFilters =
    searchQuery ||
    activeCuisine !== 'All' ||
    isVegOnly ||
    minRating !== undefined ||
    isOpenNow ||
    maxDeliveryFee !== undefined ||
    sortBy !== 'recommended';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Main Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Order Food in Bangalore
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Showing {restaurants.length} kitchens ready for delivery.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <form action="/restaurants" method="GET" className="relative flex-1 md:w-80">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search restaurant, cuisine, dish..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              {activeCuisine !== 'All' && <input type="hidden" name="cuisine" value={activeCuisine} />}
              {isVegOnly && <input type="hidden" name="veg" value="true" />}
              {isOpenNow && <input type="hidden" name="open" value="true" />}
              {minRating && <input type="hidden" name="minRating" value={String(minRating)} />}
            </form>

            <Link
              href="/search"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-orange-100 text-orange-800 hover:bg-orange-200 text-xs font-bold transition shrink-0"
              title="Global Dish Finder"
            >
              <Sparkles className="w-4 h-4 text-orange-600" /> Dish Finder
            </Link>
          </div>
        </div>

        {/* Cuisine Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {popularCuisines.map((c) => {
            const isSelected = activeCuisine.toLowerCase() === c.toLowerCase();
            const href = buildFilterUrl({ cuisine: c === 'All' ? null : c });

            return (
              <Link
                key={c}
                href={href}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/25 scale-105'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {c}
              </Link>
            );
          })}
        </div>

        {/* Filter & Sort Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
            </span>

            {/* Pure Veg Filter */}
            <Link
              href={buildFilterUrl({ veg: isVegOnly ? null : 'true' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                isVegOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isVegOnly ? 'bg-white' : 'bg-emerald-600'}`} />
              Pure Veg
            </Link>

            {/* Open Now Filter */}
            <Link
              href={buildFilterUrl({ open: isOpenNow ? null : 'true' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                isOpenNow
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Open Now
            </Link>

            {/* Rating 4.0+ */}
            <Link
              href={buildFilterUrl({ minRating: minRating === 4.0 ? null : '4.0' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                minRating === 4.0
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              4.0+ Stars
            </Link>

            {/* Delivery Fee < ₹35 */}
            <Link
              href={buildFilterUrl({ maxDeliveryFee: maxDeliveryFee === 35 ? null : '35' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                maxDeliveryFee === 35
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <IndianRupee className="w-3 h-3" />
              Fee &le; ₹35
            </Link>
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-500 font-medium">Sort by:</span>
            <div className="flex items-center gap-1 text-xs">
              {[
                { label: 'Recommended', value: 'recommended' },
                { label: 'Rating', value: 'rating' },
                { label: 'Fastest Delivery', value: 'delivery_time' },
                { label: 'Lowest Fee', value: 'delivery_fee' },
              ].map((s) => (
                <Link
                  key={s.value}
                  href={buildFilterUrl({ sortBy: s.value === 'recommended' ? null : s.value })}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    sortBy === s.value
                      ? 'bg-orange-100 text-orange-800 font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Chips Banner */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-stone-500 font-medium">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">
                &ldquo;{searchQuery}&rdquo;
                <Link href={buildFilterUrl({ q: null })} className="hover:text-orange-950">
                  <X className="w-3 h-3" />
                </Link>
              </span>
            )}
            {activeCuisine !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200 text-stone-800 font-medium">
                {activeCuisine}
                <Link href={buildFilterUrl({ cuisine: null })} className="hover:text-stone-950">
                  <X className="w-3 h-3" />
                </Link>
              </span>
            )}
            {isVegOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                Pure Veg
                <Link href={buildFilterUrl({ veg: null })} className="hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </Link>
              </span>
            )}
            {isOpenNow && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200 text-stone-800 font-medium">
                Open Now
                <Link href={buildFilterUrl({ open: null })} className="hover:text-stone-950">
                  <X className="w-3 h-3" />
                </Link>
              </span>
            )}
            {minRating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                {minRating}+ Stars
                <Link href={buildFilterUrl({ minRating: null })} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </Link>
              </span>
            )}
            {maxDeliveryFee && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200 text-stone-800 font-medium">
                Fee &le; ₹{maxDeliveryFee}
                <Link href={buildFilterUrl({ maxDeliveryFee: null })} className="hover:text-stone-950">
                  <X className="w-3 h-3" />
                </Link>
              </span>
            )}
            <Link
              href="/restaurants"
              className="text-orange-600 hover:text-orange-700 font-bold ml-2 underline"
            >
              Clear All Filters
            </Link>
          </div>
        )}

        {/* Database Warning Banner (if connection failed and using fallback) */}
        {isFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Live database syncing unavailable:</span> Displaying verified local kitchen directory.
              </div>
            </div>
            <Link
              href="/restaurants"
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100/50 flex items-center gap-1 shrink-0 transition"
            >
              <RotateCcw className="w-3 h-3" /> Retry Connection
            </Link>
          </div>
        )}

        {/* Restaurant Cards Grid */}
        {restaurants.length === 0 ? (
          dbError && !isFallback ? (
            <div className="bg-red-50 rounded-3xl border border-red-200 p-12 text-center shadow-sm max-w-md mx-auto space-y-3">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
              <h3 className="text-base font-bold text-red-900">Database Connection Issue</h3>
              <p className="text-xs text-red-700 max-w-xs mx-auto">
                We couldn&apos;t load restaurants from the server right now. Please check your internet connection or try again.
              </p>
              <div className="pt-2">
                <Link
                  href="/restaurants"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                </Link>
              </div>
            </div>
          ) : !hasActiveFilters ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center">
                <ChefHat className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">Partner Kitchens Coming to Your Area</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
                We are actively onboarding authentic restaurants and cloud kitchens. Are you a restaurant owner or chef looking to reach hungry customers?
              </p>
              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                <Link
                  href="/restaurant/signup"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-600/20 transition"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Register Your Restaurant
                </Link>
                <Link
                  href="/restaurant/login"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition"
                >
                  Partner Login <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
              <div className="pt-2 border-t border-stone-100 text-stone-400 text-[11px]">
                Platform Administrator? Manage listings in the{' '}
                <Link href="/admin/restaurants" className="text-orange-600 font-semibold hover:underline">
                  Admin Portal
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm max-w-md mx-auto space-y-3">
              <Store className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="text-base font-bold text-stone-800">No restaurants match your filters</h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Try removing some filters, adjusting your search query, or searching for a specific dish.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
                <Link
                  href="/restaurants"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition"
                >
                  Reset All Filters
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-orange-100 text-orange-800 hover:bg-orange-200 transition"
                >
                  Search Dishes Directly
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurant/${restaurant.id}`}
                className="group bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Banner Image */}
                  <div className="relative h-48 bg-stone-200 overflow-hidden">
                    {restaurant.banner_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={restaurant.banner_url}
                        alt={restaurant.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                        <Store className="w-10 h-10" />
                      </div>
                    )}

                    {/* Open / Closed Overlay */}
                    {!restaurant.is_accepting_orders && (
                      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-lg">
                          Closed &bull; Not Accepting Orders
                        </span>
                      </div>
                    )}

                    {/* Delivery Time Badge */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur text-stone-900 text-[11px] font-bold shadow-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-600" />
                      <span>{restaurant.delivery_time_min}–{restaurant.delivery_time_max} mins</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-stone-900 text-lg group-hover:text-orange-600 transition-colors">
                        {restaurant.name}
                      </h3>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-extrabold shrink-0 border border-emerald-200">
                        <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        <span>{restaurant.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-stone-500 truncate">
                      {restaurant.cuisine_types.join(' • ')}
                    </p>

                    <p className="text-xs text-stone-400 truncate">
                      {restaurant.address}, {restaurant.city}
                    </p>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 bg-stone-50/50">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-stone-400" />
                    <span>Delivery: ₹{restaurant.delivery_fee.toFixed(0)}</span>
                  </div>
                  <span className="text-stone-400">&bull;</span>
                  <span>Min Order: ₹{restaurant.minimum_order.toFixed(0)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
