'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotificationIdempotent } from '@/actions/notification';
import type { Review } from '@/types/database.types';

export type ReviewActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export interface ReviewWithCustomer extends Review {
  customer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  order?: {
    order_number: string;
    created_at: string;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  percentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recommendationPercentage: number;
}

/**
 * 1. CHECK REVIEW ELIGIBILITY (STRICT SERVER-SIDE VALIDATION)
 * A customer is eligible to review if and only if:
 * 1. User is authenticated.
 * 2. Order belongs to this customer.
 * 3. Order status is strictly 'DELIVERED'.
 * 4. Customer has not already reviewed this order.
 */
export async function checkReviewEligibilityAction(orderId: string): Promise<{
  eligible: boolean;
  alreadyReviewed: boolean;
  reason?: string;
  existingReview?: Review | null;
  order?: {
    id: string;
    order_number: string;
    restaurant_id: string;
    restaurant_name: string;
    delivered_at: string;
  } | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { eligible: false, alreadyReviewed: false, reason: 'Authentication required.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderErr } = await (supabase.from('orders') as any)
      .select('id, order_number, customer_id, restaurant_id, status, updated_at, restaurant:restaurants(id, name)')
      .eq('id', orderId)
      .single();

    if (orderErr || !orderData) {
      return { eligible: false, alreadyReviewed: false, reason: 'Order not found.' };
    }

    if (orderData.customer_id !== user.id) {
      return { eligible: false, alreadyReviewed: false, reason: 'Unauthorized: You do not own this order.' };
    }

    // Strict status verification: Must be DELIVERED
    if (orderData.status !== 'DELIVERED') {
      return {
        eligible: false,
        alreadyReviewed: false,
        reason: `Reviews can only be submitted for completed orders. Current order status: ${orderData.status.replace(/_/g, ' ')}`,
      };
    }

    // Check if already reviewed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingReview } = await (supabase.from('reviews') as any)
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingReview) {
      return {
        eligible: false,
        alreadyReviewed: true,
        reason: 'You have already reviewed this meal order.',
        existingReview: existingReview as Review,
        order: {
          id: orderData.id,
          order_number: orderData.order_number,
          restaurant_id: orderData.restaurant_id,
          restaurant_name: orderData.restaurant?.name || 'Restaurant',
          delivered_at: orderData.updated_at,
        },
      };
    }

    return {
      eligible: true,
      alreadyReviewed: false,
      order: {
        id: orderData.id,
        order_number: orderData.order_number,
        restaurant_id: orderData.restaurant_id,
        restaurant_name: orderData.restaurant?.name || 'Restaurant',
        delivered_at: orderData.updated_at,
      },
    };
  } catch (err) {
    console.error('Error checking review eligibility:', err);
    return { eligible: false, alreadyReviewed: false, reason: 'Server error checking eligibility.' };
  }
}

/**
 * 2. SUBMIT REVIEW WITH REPUTATION RECALCULATION
 */
export async function submitReviewAction(params: {
  orderId: string;
  rating: number;
  comment?: string;
}): Promise<ReviewActionResponse<Review>> {
  try {
    const { orderId, rating, comment } = params;

    // Validate rating integer bounds (1 to 5)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be an integer between 1 and 5 stars.' };
    }

    // Validate comment length (max 1000 characters)
    const cleanComment = comment ? comment.trim().slice(0, 1000) : null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be signed in to submit a review.' };
    }

    // Re-verify eligibility on the server
    const eligibility = await checkReviewEligibilityAction(orderId);
    if (!eligibility.eligible || !eligibility.order) {
      return { success: false, error: eligibility.reason || 'You are not eligible to review this order.' };
    }

    const restaurantId = eligibility.order.restaurant_id;

    // 1. Insert review into database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newReview, error: insertError } = await (supabase.from('reviews') as any)
      .insert({
        order_id: orderId,
        restaurant_id: restaurantId,
        customer_id: user.id,
        rating,
        comment: cleanComment,
      })
      .select()
      .single();

    if (insertError || !newReview) {
      console.error('Review insertion error:', insertError);
      return { success: false, error: 'Could not record review. Please try again.' };
    }

    // 2. Atomically recalculate restaurant reputation metrics from actual database records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allReviews, error: reviewsError } = await (supabase.from('reviews') as any)
      .select('rating')
      .eq('restaurant_id', restaurantId);

    if (!reviewsError && allReviews && allReviews.length > 0) {
      const totalCount = allReviews.length;
      const sumRatings = allReviews.reduce((acc: number, r: { rating: number }) => acc + Number(r.rating), 0);
      const calculatedAvg = Math.round((sumRatings / totalCount) * 10) / 10;

      // Update restaurants table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('restaurants') as any)
        .update({
          rating: calculatedAvg,
          total_reviews: totalCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId);
    }

    // 3. Notify Restaurant Owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: restaurantData } = await (supabase.from('restaurants') as any)
      .select('owner_id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantData?.owner_id) {
      await createNotificationIdempotent({
        userId: restaurantData.owner_id,
        title: `New ${rating}★ Review Received! ⭐`,
        message: `A customer reviewed order #${eligibility.order.order_number}: "${cleanComment ? cleanComment.slice(0, 80) + '...' : rating + ' Stars'}"`,
        type: 'ORDER',
        orderId,
      });
    }

    revalidatePath(`/restaurant/${restaurantId}`);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/restaurants');
    revalidatePath('/restaurant/reviews');

    return {
      success: true,
      data: newReview as Review,
      message: 'Thank you! Your verified review has been published.',
    };
  } catch (error) {
    console.error('Error submitting review:', error);
    return { success: false, error: 'Internal server error while submitting review.' };
  }
}

/**
 * 3. GET RESTAURANT REVIEWS & STATS (REAL SUPABASE DATA ONLY)
 */
export async function getRestaurantReviewsAction(
  restaurantId: string,
  filterRating?: number
): Promise<ReviewActionResponse<{ reviews: ReviewWithCustomer[]; stats: ReviewStats }>> {
  try {
    const supabase = await createClient();

    // Query all reviews for this restaurant to calculate real stats with fast timeout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewsPromise = (supabase.from('reviews') as any)
      .select(`
        *,
        customer:profiles!customer_id(id, full_name, avatar_url),
        order:orders!order_id(order_number, created_at)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Reviews query timed out')), 2000)
    );

    const { data: allReviews, error: allErr } = await Promise.race([reviewsPromise, timeoutPromise]);

    if (allErr) {
      console.error('Error fetching restaurant reviews:', allErr);
      return { success: false, error: allErr.message };
    }

    const rawList = (allReviews || []) as ReviewWithCustomer[];

    // Calculate real review statistics
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    rawList.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating)))) as 1 | 2 | 3 | 4 | 5;
      breakdown[star] = (breakdown[star] || 0) + 1;
      sum += star;
    });

    const total = rawList.length;
    const averageRating = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    const percentages = {
      5: total > 0 ? Math.round((breakdown[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((breakdown[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((breakdown[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((breakdown[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((breakdown[1] / total) * 100) : 0,
    };

    const positiveReviews = breakdown[5] + breakdown[4];
    const recommendationPercentage = total > 0 ? Math.round((positiveReviews / total) * 100) : 0;

    // Filter displayed list if a specific star rating is selected
    const displayedReviews =
      filterRating && filterRating >= 1 && filterRating <= 5
        ? rawList.filter((r) => Math.round(Number(r.rating)) === filterRating)
        : rawList;

    return {
      success: true,
      data: {
        reviews: displayedReviews,
        stats: {
          averageRating,
          totalReviews: total,
          breakdown,
          percentages,
          recommendationPercentage,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching restaurant reviews action:', error);
    return { success: false, error: 'Could not load reviews.' };
  }
}

/**
 * 4. OWNER REPLY TO REVIEW
 */
export async function replyToReviewAction(params: {
  reviewId: string;
  replyText: string;
}): Promise<ReviewActionResponse> {
  try {
    const { reviewId, replyText } = params;
    const cleanReply = replyText.trim();

    if (!cleanReply) {
      return { success: false, error: 'Reply text cannot be empty.' };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // Verify user owns the restaurant of this review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviewData, error: revErr } = await (supabase.from('reviews') as any)
      .select('id, restaurant_id, customer_id, restaurant:restaurants(owner_id, name)')
      .eq('id', reviewId)
      .single();

    if (revErr || !reviewData) {
      return { success: false, error: 'Review not found.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = reviewData.restaurant?.owner_id === user.id;
    const isAdmin = profile?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Unauthorized: Only the restaurant owner or platform admin can reply.' };
    }

    // Update review record with owner reply
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase.from('reviews') as any)
      .update({
        owner_reply: cleanReply,
        owner_replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Notify customer that restaurant replied to their review
    await createNotificationIdempotent({
      userId: reviewData.customer_id,
      title: `${reviewData.restaurant?.name || 'The restaurant'} replied to your review! 💬`,
      message: `"${cleanReply.slice(0, 100)}"`,
      type: 'SYSTEM',
    });

    revalidatePath(`/restaurant/${reviewData.restaurant_id}`);
    revalidatePath('/restaurant/reviews');

    return { success: true, message: 'Reply posted successfully.' };
  } catch (error) {
    console.error('Error replying to review:', error);
    return { success: false, error: 'Internal error replying to review.' };
  }
}

/**
 * 5. ADMIN MODERATION / DELETE ABUSE REVIEW
 */
export async function deleteReviewAction(reviewId: string): Promise<ReviewActionResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // Check admin role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin moderation privileges required.' };
    }

    // Get restaurant_id before deletion to recalculate rating
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rev } = await (supabase.from('reviews') as any)
      .select('restaurant_id')
      .eq('id', reviewId)
      .single();

    if (!rev) {
      return { success: false, error: 'Review not found.' };
    }

    // Delete review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delErr } = await (supabase.from('reviews') as any)
      .delete()
      .eq('id', reviewId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // Recalculate restaurant metrics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: remainingReviews } = await (supabase.from('reviews') as any)
      .select('rating')
      .eq('restaurant_id', rev.restaurant_id);

    const total = remainingReviews?.length || 0;
    const sum = (remainingReviews || []).reduce((acc: number, r: { rating: number }) => acc + Number(r.rating), 0);
    const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('restaurants') as any)
      .update({
        rating: avg,
        total_reviews: total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rev.restaurant_id);

    revalidatePath(`/restaurant/${rev.restaurant_id}`);
    revalidatePath('/admin/reviews');
    revalidatePath('/restaurant/reviews');

    return { success: true, message: 'Review removed and restaurant rating recalculated.' };
  } catch (error) {
    console.error('Error deleting review:', error);
    return { success: false, error: 'Failed to delete review.' };
  }
}

/**
 * 6. GET ALL REVIEWS FOR RESTAURANT OWNER DASHBOARD
 */
export async function getOwnerRestaurantReviewsAction(
  restaurantId: string
): Promise<ReviewActionResponse<ReviewWithCustomer[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('reviews') as any)
      .select(`
        *,
        customer:profiles!customer_id(id, full_name, avatar_url),
        order:orders!order_id(order_number, created_at)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as ReviewWithCustomer[] };
  } catch (error) {
    console.error('Error fetching owner reviews:', error);
    return { success: false, error: 'Could not load reviews.' };
  }
}

/**
 * 7. GET ALL REVIEWS ACROSS PLATFORM FOR ADMIN MODERATION
 */
export async function getAllReviewsAdminAction(): Promise<
  ReviewActionResponse<(ReviewWithCustomer & { restaurant: { name: string; city: string } })[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('reviews') as any)
      .select(`
        *,
        customer:profiles!customer_id(id, full_name, avatar_url),
        order:orders!order_id(order_number, created_at),
        restaurant:restaurants(name, city)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { success: true, data: (data || []) as any };
  } catch (error) {
    console.error('Error fetching all reviews for admin:', error);
    return { success: false, error: 'Could not load platform reviews.' };
  }
}
