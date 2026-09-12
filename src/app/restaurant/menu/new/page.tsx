import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant, getMenuCategories } from '@/actions/restaurant';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { ItemForm } from '@/components/restaurant/item-form';

export default async function NewMenuItemPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/menu/new');
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
        <h1 className="text-xl font-bold text-stone-900">Add Menu Item</h1>
        <p className="text-xs text-stone-500">Create a delicious new addition to your restaurant&apos;s menu.</p>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <ItemForm restaurantId={restaurant.id} categories={categories} />
      </main>
    </div>
  );
}
