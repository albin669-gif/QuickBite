import { Navbar } from '@/components/navbar';
import { getRestaurantWithMenu } from '@/actions/restaurant';
import { getRestaurantReviewsAction } from '@/actions/review';
import { notFound } from 'next/navigation';
import { RestaurantMenuView } from '@/components/customer/restaurant-menu-view';
import { RestaurantReviewsSection } from '@/components/reviews/restaurant-reviews-section';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await getRestaurantWithMenu(resolvedParams.id);
  if (!data) {
    return { title: 'Restaurant Not Found | QuickBite' };
  }
  return {
    title: `${data.restaurant.name} Menu & Reviews | QuickBite`,
    description: `Order fresh food online from ${data.restaurant.name} in ${data.restaurant.city}. Verified customer reviews and ratings. Fast delivery via QuickBite.`,
  };
}

export default async function CustomerRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const data = await getRestaurantWithMenu(resolvedParams.id);

  if (!data) {
    notFound();
  }

  const { restaurant, categories, items, hours } = data;

  // Load real verified customer reviews and aggregated statistics
  const reviewsRes = await getRestaurantReviewsAction(restaurant.id);
  const reviews = reviewsRes.success && reviewsRes.data ? reviewsRes.data.reviews : [];
  const stats = reviewsRes.success && reviewsRes.data
    ? reviewsRes.data.stats
    : {
        averageRating: restaurant.rating || 0,
        totalReviews: restaurant.total_reviews || 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recommendationPercentage: 0,
      };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <RestaurantMenuView
          restaurant={restaurant}
          categories={categories}
          items={items}
          hours={hours}
        />

        {/* Real Customer Reviews & Rating Breakdown */}
        <RestaurantReviewsSection
          restaurantName={restaurant.name}
          initialReviews={reviews}
          stats={stats}
        />
      </main>
    </div>
  );
}
