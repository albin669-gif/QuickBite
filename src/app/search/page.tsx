import { Navbar } from '@/components/navbar';
import { searchDishes } from '@/actions/restaurant';
import Link from 'next/link';
import { Search, Star, Clock, UtensilsCrossed, ArrowRight } from 'lucide-react';

export default async function FoodSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; veg?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  const isVegOnly = resolvedParams.veg === 'true';

  const dishes = query ? await searchDishes(query, isVegOnly) : [];

  const popularSearches = [
    'Biryani',
    'Butter Chicken',
    'Masala Dosa',
    'Paneer Tikka',
    'Mutton Dum',
    'Filter Coffee',
    'Chaat',
    'Lassi',
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search Header Banner */}
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Find Your Favorite Cravings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Search across all kitchens in Bangalore for your favorite dish or snack.
          </p>

          <form action="/search" method="GET" className="relative mt-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search for 'biryani', 'dosa', 'kebab', 'paneer'..."
              className="w-full pl-12 pr-28 py-3.5 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-md shadow-orange-500/10"
              autoFocus
            />
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-4" />
            {isVegOnly && <input type="hidden" name="veg" value="true" />}
            <button
              type="submit"
              className="absolute right-2 top-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Quick Filter & Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Link
              href={`/search?q=${encodeURIComponent(query)}&veg=${isVegOnly ? 'false' : 'true'}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 ${
                isVegOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isVegOnly ? 'bg-white' : 'bg-emerald-600'}`} />
              Pure Veg Only
            </Link>

            <span className="text-stone-300">|</span>

            {popularSearches.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}${isVegOnly ? '&veg=true' : ''}`}
                className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>

        {/* Results Section */}
        {query && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="text-base font-bold text-stone-900">
                Found {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} for &ldquo;{query}&rdquo;
              </h2>
              {isVegOnly && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Showing Vegetarian Only
                </span>
              )}
            </div>

            {dishes.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-stone-200 shadow-sm max-w-md mx-auto space-y-3">
                <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="text-base font-bold text-stone-800">No dishes matched your search</h3>
                <p className="text-xs text-stone-500">
                  Try another keyword like &quot;biryani&quot;, &quot;dosa&quot;, or check spelling.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dishes.map((dish) => (
                  <Link
                    key={dish.id}
                    href={`/restaurant/${dish.restaurant_id}#dish-${dish.id}`}
                    className="group bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Dish Photo */}
                      <div className="relative h-44 bg-stone-100 overflow-hidden">
                        {dish.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <UtensilsCrossed className="w-8 h-8" />
                          </div>
                        )}

                        {/* Dietary Badge */}
                        <span
                          className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                            dish.is_veg
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-red-50 text-red-800 border border-red-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dish.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          {dish.is_veg ? 'Veg' : 'Non-Veg'}
                        </span>

                        {/* Price Badge */}
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-stone-900/90 backdrop-blur text-white text-xs font-extrabold shadow-md">
                          ₹{dish.price.toFixed(2)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-stone-900 text-base group-hover:text-orange-600 transition-colors leading-snug">
                          {dish.name}
                        </h3>

                        {dish.description && (
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Restaurant Metadata Footer */}
                    <div className="p-4 pt-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-stone-900 truncate max-w-[170px]">
                          {dish.restaurant.name}
                        </p>
                        <div className="flex items-center gap-2 text-stone-500 text-[11px] mt-0.5">
                          <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            {dish.restaurant.rating.toFixed(1)}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {dish.restaurant.delivery_time_min}m
                          </span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Order</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
