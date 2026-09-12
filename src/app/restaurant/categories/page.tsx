import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant, getMenuCategories } from '@/actions/restaurant';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { CategoriesManager } from '@/components/restaurant/categories-manager';

export default async function RestaurantCategoriesPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/categories');
  }

  if (profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) {
    redirect('/restaurant/dashboard');
  }

  const categories = await getMenuCategories(restaurant.id);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Manage Menu Categories</h1>
        <p className="text-xs text-stone-500">Organize your menu into structured sections.</p>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <CategoriesManager restaurantId={restaurant.id} initialCategories={categories} />
      </main>
    </div>
  );
}
