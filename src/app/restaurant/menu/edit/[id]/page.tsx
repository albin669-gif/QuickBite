import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant, getMenuCategories, getMenuItemById } from '@/actions/restaurant';
import { redirect, notFound } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { ItemForm } from '@/components/restaurant/item-form';

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const resolvedParams = await params;
  const item = await getMenuItemById(resolvedParams.id);

  if (!item || item.restaurant_id !== restaurant.id) {
    notFound();
  }

  const categories = await getMenuCategories(restaurant.id);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Edit Dish</h1>
        <p className="text-xs text-stone-500">Update pricing, description, or availability.</p>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <ItemForm restaurantId={restaurant.id} categories={categories} initialItem={item} />
      </main>
    </div>
  );
}
