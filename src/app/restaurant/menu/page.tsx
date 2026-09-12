import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant, getMenuCategories, getMenuItems } from '@/actions/restaurant';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { ItemToggle } from '@/components/restaurant/item-toggle';
import { ItemDeleteButton } from '@/components/restaurant/item-delete-button';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit, UtensilsCrossed, Clock } from 'lucide-react';

export default async function RestaurantMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/menu');
  }

  if (profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) {
    redirect('/restaurant/dashboard');
  }

  const resolvedParams = await searchParams;
  const activeCategoryId = resolvedParams.category;

  const categories = await getMenuCategories(restaurant.id);
  const items = await getMenuItems(restaurant.id, activeCategoryId);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Menu Management</h1>
          <p className="text-xs text-stone-500">
            Manage your food items, pricing in INR, availability, and descriptions.
          </p>
        </div>
        <Link href="/restaurant/menu/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add New Dish
          </Button>
        </Link>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Link
            href="/restaurant/menu"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              !activeCategoryId
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            All Items ({items.length})
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/restaurant/menu?category=${cat.id}`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategoryId === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              {cat.name}
            </Link>
          ))}
          <Link
            href="/restaurant/categories"
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 whitespace-nowrap"
          >
            + Manage Categories
          </Link>
        </div>

        {/* Menu Items List */}
        {items.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-stone-200 shadow-sm">
            <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">No dishes found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {activeCategoryId
                ? 'No items exist in this category yet.'
                : 'Start crafting your restaurant menu by adding your first signature dish.'}
            </p>
            <div className="mt-5">
              <Link href="/restaurant/menu/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Add First Dish
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => {
              const category = categories.find((c) => c.id === item.category_id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Item Thumbnail */}
                    <div className="relative h-44 bg-stone-100 overflow-hidden">
                      {item.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                          <UtensilsCrossed className="w-8 h-8 mb-1" />
                          <span className="text-[11px]">No image uploaded</span>
                        </div>
                      )}

                      {/* Veg / Non-Veg Badge */}
                      <span
                        className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          item.is_veg
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-red-50 text-red-800 border border-red-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                        {item.is_veg ? 'Veg' : 'Non-Veg'}
                      </span>

                      {/* Category Tag */}
                      {category && (
                        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white backdrop-blur-sm">
                          {category.name}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-stone-900 text-base leading-snug">
                          {item.name}
                        </h4>
                        <span className="font-extrabold text-stone-900 text-base shrink-0">
                          ₹{item.price.toFixed(2)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-stone-400 pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Prep: {item.preparation_time_minutes} mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <ItemToggle itemId={item.id} initialAvailable={item.is_available} />

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/restaurant/menu/edit/${item.id}`}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition"
                        title="Edit dish"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <ItemDeleteButton itemId={item.id} itemName={item.name} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
