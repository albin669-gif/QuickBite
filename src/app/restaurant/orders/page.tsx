import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant } from '@/actions/restaurant';
import { getRestaurantOrders } from '@/actions/order';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { LiveOrdersTerminal } from '@/components/restaurant/live-orders-terminal';

export default async function RestaurantOrdersPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/orders');
  }

  if (profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) {
    redirect('/restaurant/dashboard');
  }

  const orders = await getRestaurantOrders(restaurant.id);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Live Kitchen Orders</h1>
        <p className="text-xs text-stone-500">
          Real-time order queue and kitchen food preparation terminal for {restaurant.name}.
        </p>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <LiveOrdersTerminal initialOrders={orders} restaurantId={restaurant.id} />
      </main>
    </div>
  );
}
