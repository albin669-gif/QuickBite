import { getCurrentUserProfile } from '@/actions/auth';
import { getOwnerRestaurant } from '@/actions/restaurant';
import { getOwnerRestaurantReviewsAction } from '@/actions/review';
import { redirect } from 'next/navigation';
import { RestaurantNav } from '@/components/restaurant/restaurant-nav';
import { RestaurantReviewsView } from '@/components/restaurant/restaurant-reviews-view';

export const metadata = {
  title: 'Customer Reviews - Restaurant Portal | QuickBite',
};

export default async function RestaurantReviewsPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/restaurant/login?redirect=/restaurant/reviews');
  }

  if (profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) {
    redirect('/restaurant/dashboard');
  }

  const res = await getOwnerRestaurantReviewsAction(restaurant.id);
  const reviews = res.success && res.data ? res.data : [];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Customer Feedback & Reviews</h1>
        <p className="text-xs text-stone-500">
          Monitor your customer satisfaction, review verified order ratings, and post official responses.
        </p>
      </header>

      <RestaurantNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <RestaurantReviewsView
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          initialReviews={reviews}
        />
      </main>
    </div>
  );
}
