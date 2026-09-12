import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant } from '@/actions/restaurant';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { ProfileForm } from '@/components/restaurant/profile-form';

export default async function RestaurantProfilePage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/profile');
  }

  if (profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) {
    redirect('/restaurant/dashboard');
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Restaurant Settings & Profile</h1>
        <p className="text-xs text-stone-500">Configure your storefront branding, location, and delivery policies.</p>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <ProfileForm restaurant={restaurant} />
      </main>
    </div>
  );
}
