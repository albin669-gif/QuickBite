'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Restaurant, MenuCategory, MenuItem, Tables, Profile } from '@/types/database.types';
import {
  CANONICAL_RESTAURANTS,
  CANONICAL_CATEGORIES,
  CANONICAL_ITEMS,
  CANONICAL_HOURS,
  isDevFallbackEnabled,
} from '@/lib/canonical-seed';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Get or automatically initialize restaurant for the current authenticated owner
 */
export async function getOwnerRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching owner restaurant:', error);
    return null;
  }

  if (restaurant) {
    return restaurant as unknown as Restaurant;
  }

  // If the user has RESTAURANT_OWNER role but no restaurant record yet, create an initial draft
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userProfile = profileData as unknown as Profile | null;
  if (userProfile && (userProfile.role === 'RESTAURANT_OWNER' || userProfile.role === 'ADMIN')) {
    const defaultName = userProfile.full_name ? `${userProfile.full_name}'s Kitchen` : 'My Restaurant';
    const insertPayload = {
      owner_id: user.id,
      name: defaultName,
      description: 'Authentic Indian flavors prepared fresh daily.',
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560001',
      phone: userProfile.phone || '+91 98765 43210',
      email: userProfile.email || user.email,
      cuisine_types: ['North Indian', 'Biryani'],
      delivery_time_min: 25,
      delivery_time_max: 40,
      minimum_order: 149.00,
      delivery_fee: 35.00,
      is_active: true,
      is_accepting_orders: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newRest, error: createError } = await (supabase.from('restaurants') as any)
      .insert(insertPayload)
      .select()
      .single();

    if (createError) {
      console.error('Error creating default restaurant:', createError);
      return null;
    }

    return newRest as unknown as Restaurant;
  }

  return null;
}

/**
 * Update Restaurant profile details
 */
export async function updateRestaurantProfile(formData: FormData): Promise<ActionResponse<Restaurant>> {
  const restaurantId = formData.get('restaurantId') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const address = formData.get('address') as string;
  const city = formData.get('city') as string;
  const state = formData.get('state') as string;
  const postalCode = formData.get('postalCode') as string;
  const cuisineTypesRaw = formData.get('cuisineTypes') as string;
  const minimumOrder = parseFloat(formData.get('minimumOrder') as string) || 0;
  const deliveryFee = parseFloat(formData.get('deliveryFee') as string) || 0;
  const deliveryTimeMin = parseInt(formData.get('deliveryTimeMin') as string, 10) || 20;
  const deliveryTimeMax = parseInt(formData.get('deliveryTimeMax') as string, 10) || 35;
  const isAcceptingOrders = formData.get('isAcceptingOrders') === 'true';
  const logoUrl = formData.get('logoUrl') as string | null;
  const bannerUrl = formData.get('bannerUrl') as string | null;

  if (!restaurantId || !name || !address || !postalCode) {
    return { success: false, error: 'Restaurant name, address, and postal code are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Split comma-separated cuisines
  const cuisineTypes = cuisineTypesRaw
    ? cuisineTypesRaw.split(',').map((c) => c.trim()).filter(Boolean)
    : ['North Indian'];

  const updatePayload: Record<string, unknown> = {
    name: name.trim(),
    description: description ? description.trim() : null,
    phone: phone ? phone.trim() : null,
    email: email ? email.trim() : null,
    address: address.trim(),
    city: city ? city.trim() : 'Bangalore',
    state: state ? state.trim() : 'Karnataka',
    postal_code: postalCode.trim(),
    cuisine_types: cuisineTypes,
    minimum_order: minimumOrder,
    delivery_fee: deliveryFee,
    delivery_time_min: deliveryTimeMin,
    delivery_time_max: deliveryTimeMax,
    is_accepting_orders: isAcceptingOrders,
  };

  if (logoUrl) updatePayload.logo_url = logoUrl;
  if (bannerUrl) updatePayload.banner_url = bannerUrl;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('restaurants') as any)
    .update(updatePayload)
    .eq('id', restaurantId)
    .eq('owner_id', user.id) // Strict ownership
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/restaurant/dashboard');
  revalidatePath('/restaurant/profile');
  revalidatePath('/restaurants');
  revalidatePath(`/restaurant/${restaurantId}`);

  return {
    success: true,
    data: data as unknown as Restaurant,
    message: 'Restaurant profile updated successfully.',
  };
}

/**
 * Toggle accepting orders state
 */
export async function toggleAcceptingOrders(restaurantId: string, isAccepting: boolean): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('restaurants') as any)
    .update({ is_accepting_orders: isAccepting })
    .eq('id', restaurantId)
    .eq('owner_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/dashboard');
  revalidatePath(`/restaurant/${restaurantId}`);

  return { success: true, message: `Kitchen is now ${isAccepting ? 'OPEN' : 'CLOSED'}` };
}

/**
 * Get restaurant operating hours
 */
export async function getRestaurantHours(restaurantId: string): Promise<Tables<'restaurant_hours'>[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('restaurant_hours')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('day_of_week', { ascending: true });

  return (data as unknown as Tables<'restaurant_hours'>[]) || [];
}

/**
 * Update restaurant operating hours
 */
export async function updateRestaurantHours(
  restaurantId: string,
  hours: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[]
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Verify ownership
  const { data: rest } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single();

  if (!rest) return { success: false, error: 'Unauthorized.' };

  for (const h of hours) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('restaurant_hours') as any).upsert(
      {
        restaurant_id: restaurantId,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      },
      { onConflict: 'restaurant_id,day_of_week' }
    );
  }

  revalidatePath('/restaurant/profile');
  return { success: true, message: 'Opening hours updated.' };
}

/**
 * Get categories for a restaurant
 */
export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data as unknown as MenuCategory[]) || [];
}

/**
 * Create a menu category
 */
export async function createMenuCategory(formData: FormData): Promise<ActionResponse<MenuCategory>> {
  const restaurantId = formData.get('restaurantId') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const displayOrder = parseInt(formData.get('displayOrder') as string, 10) || 0;

  if (!restaurantId || !name) {
    return { success: false, error: 'Category name is required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Verify ownership
  const { data: rest } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single();

  if (!rest) return { success: false, error: 'Unauthorized.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('menu_categories') as any)
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      description: description ? description.trim() : null,
      display_order: displayOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  revalidatePath('/restaurant/categories');
  revalidatePath(`/restaurant/${restaurantId}`);

  return {
    success: true,
    data: data as unknown as MenuCategory,
    message: 'Category created successfully.',
  };
}

/**
 * Update a menu category
 */
export async function updateMenuCategory(formData: FormData): Promise<ActionResponse<MenuCategory>> {
  const categoryId = formData.get('categoryId') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const isActive = formData.get('isActive') === 'true';

  if (!categoryId || !name) {
    return { success: false, error: 'Category ID and name are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Update category with owner check via RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('menu_categories') as any)
    .update({
      name: name.trim(),
      description: description ? description.trim() : null,
      is_active: isActive,
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  revalidatePath('/restaurant/categories');

  return {
    success: true,
    data: data as unknown as MenuCategory,
    message: 'Category updated successfully.',
  };
}

/**
 * Delete category with safety check for linked items
 */
export async function deleteMenuCategory(categoryId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Check if items belong to this category
  const { count, error: countError } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (countError) return { success: false, error: countError.message };

  if (count && count > 0) {
    // Gracefully unassign items rather than crashing foreign key constraints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_items') as any)
      .update({ category_id: null })
      .eq('category_id', categoryId);
  }

  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  revalidatePath('/restaurant/categories');

  return { success: true, message: 'Category removed successfully.' };
}

/**
 * Get all menu items for a restaurant
 */
export async function getMenuItems(restaurantId: string, categoryId?: string): Promise<MenuItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }

  return (data as unknown as MenuItem[]) || [];
}

/**
 * Get single menu item by ID
 */
export async function getMenuItemById(itemId: string): Promise<MenuItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as MenuItem;
}

/**
 * Create a new Menu Item
 */
export async function createMenuItem(formData: FormData): Promise<ActionResponse<MenuItem>> {
  const restaurantId = formData.get('restaurantId') as string;
  const categoryId = (formData.get('categoryId') as string) || null;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const priceRaw = formData.get('price') as string;
  const imageUrl = formData.get('imageUrl') as string | null;
  const isVeg = formData.get('isVeg') === 'true';
  const isAvailable = formData.get('isAvailable') !== 'false';
  const prepTime = parseInt(formData.get('prepTime') as string, 10) || 15;

  if (!restaurantId || !name || !priceRaw) {
    return { success: false, error: 'Restaurant ID, item name, and price are required.' };
  }

  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    return { success: false, error: 'Price must be a valid non-negative number.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Check restaurant ownership
  const { data: rest } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single();

  if (!rest) return { success: false, error: 'Unauthorized to modify this restaurant.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('menu_items') as any)
    .insert({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: name.trim(),
      description: description ? description.trim() : null,
      price: price, // Stored as numeric
      image_url: imageUrl ? imageUrl.trim() : null,
      is_veg: isVeg,
      is_available: isAvailable,
      preparation_time_minutes: prepTime,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  revalidatePath(`/restaurant/${restaurantId}`);

  return {
    success: true,
    data: data as unknown as MenuItem,
    message: 'Food item added to menu.',
  };
}

/**
 * Update existing Menu Item
 */
export async function updateMenuItem(formData: FormData): Promise<ActionResponse<MenuItem>> {
  const itemId = formData.get('itemId') as string;
  const categoryId = (formData.get('categoryId') as string) || null;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const priceRaw = formData.get('price') as string;
  const imageUrl = formData.get('imageUrl') as string | null;
  const isVeg = formData.get('isVeg') === 'true';
  const isAvailable = formData.get('isAvailable') === 'true';
  const prepTime = parseInt(formData.get('prepTime') as string, 10) || 15;

  if (!itemId || !name || !priceRaw) {
    return { success: false, error: 'Item ID, name, and price are required.' };
  }

  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    return { success: false, error: 'Price must be a valid non-negative number.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  const updateData: Record<string, unknown> = {
    name: name.trim(),
    description: description ? description.trim() : null,
    price: price,
    category_id: categoryId,
    is_veg: isVeg,
    is_available: isAvailable,
    preparation_time_minutes: prepTime,
  };

  if (imageUrl !== null && imageUrl !== undefined) {
    updateData.image_url = imageUrl.trim() || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('menu_items') as any)
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  return {
    success: true,
    data: data as unknown as MenuItem,
    message: 'Food item updated.',
  };
}

/**
 * Delete Menu Item
 */
export async function deleteMenuItem(itemId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  return { success: true, message: 'Item deleted from menu.' };
}

/**
 * Quick toggle item availability (In stock / Out of stock)
 */
export async function toggleMenuItemAvailability(itemId: string, isAvailable: boolean): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('menu_items') as any)
    .update({ is_available: isAvailable })
    .eq('id', itemId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/restaurant/menu');
  return { success: true, message: `Item marked as ${isAvailable ? 'Available' : 'Unavailable'}.` };
}

export interface RestaurantFilterParams {
  search?: string;
  cuisine?: string;
  vegOnly?: boolean;
  minRating?: number;
  openNow?: boolean;
  maxDeliveryFee?: number;
  sortBy?: 'recommended' | 'rating' | 'delivery_time' | 'delivery_fee' | 'min_order';
}

export interface DishSearchResult extends MenuItem {
  restaurant: {
    id: string;
    name: string;
    rating: number;
    total_reviews: number;
    delivery_fee: number;
    delivery_time_min: number;
    delivery_time_max: number;
    is_accepting_orders: boolean;
  };
}

export interface GetActiveRestaurantsResult {
  restaurants: Restaurant[];
  error: string | null;
  isFallback: boolean;
}

/**
 * Get active restaurants for customer storefront with advanced filters and sorting
 */
export async function getActiveRestaurants(
  paramsOrCuisine?: string | RestaurantFilterParams,
  searchQueryLegacy?: string
): Promise<Restaurant[]> {
  const result = await getActiveRestaurantsWithStatus(paramsOrCuisine, searchQueryLegacy);
  return result.restaurants;
}

/**
 * Internal query engine that returns both filtered restaurants and operational status
 */
export async function getActiveRestaurantsWithStatus(
  paramsOrCuisine?: string | RestaurantFilterParams,
  searchQueryLegacy?: string
): Promise<GetActiveRestaurantsResult> {
  let params: RestaurantFilterParams = {};

  if (typeof paramsOrCuisine === 'string') {
    params = {
      cuisine: paramsOrCuisine,
      search: searchQueryLegacy,
    };
  } else if (paramsOrCuisine) {
    params = paramsOrCuisine;
  }

  let dbRestaurants: Restaurant[] = [];
  let isFallback = false;
  let dbError: string | null = null;

  try {
    const supabase = await createClient();
    let query = supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true);

    if (params.openNow) {
      query = query.eq('is_accepting_orders', true);
    }

    if (params.minRating && params.minRating > 0) {
      query = query.gte('rating', params.minRating);
    }

    if (params.maxDeliveryFee !== undefined && params.maxDeliveryFee > 0) {
      query = query.lte('delivery_fee', params.maxDeliveryFee);
    }

    // Wrap query with an 8s timeout to handle serverless cold starts gracefully
    const queryPromise = query;
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out')), 8000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    if (error) {
      throw error;
    }
    dbRestaurants = (data as unknown as Restaurant[]) || [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database connection error';
    console.error('Error fetching restaurants from Supabase:', message);
    dbError = message;

    if (isDevFallbackEnabled()) {
      isFallback = true;
      dbRestaurants = CANONICAL_RESTAURANTS.filter((r) => r.is_active);
    } else {
      isFallback = false;
      dbRestaurants = [];
    }
  }

  let results = [...dbRestaurants];

  // If we have active filters and were able to query DB (or using fallback), apply the remaining in-memory filters
  if (params.openNow && isFallback) {
    results = results.filter((r) => r.is_accepting_orders);
  }
  if (params.minRating && params.minRating > 0 && isFallback) {
    results = results.filter((r) => r.rating >= params.minRating!);
  }
  if (params.maxDeliveryFee !== undefined && params.maxDeliveryFee > 0 && isFallback) {
    results = results.filter((r) => r.delivery_fee <= params.maxDeliveryFee!);
  }

  // Filter by search query (restaurant name, cuisines, or matching dish)
  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();

    // Check matched dishes
    let matchedDishRestIds = new Set<string>();
    if (!isFallback) {
      try {
        const supabase = await createClient();
        const { data: matchedDishes } = await supabase
          .from('menu_items')
          .select('restaurant_id')
          .ilike('name', `%${q}%`);
        matchedDishRestIds = new Set(
          (matchedDishes as unknown as { restaurant_id: string }[] || []).map((d) => d.restaurant_id)
        );
      } catch {
        // Ignore dish search error
      }
    } else {
      CANONICAL_ITEMS.filter((item) => item.name.toLowerCase().includes(q)).forEach((item) => {
        matchedDishRestIds.add(item.restaurant_id);
      });
    }

    results = results.filter((r) => {
      const nameMatch = r.name.toLowerCase().includes(q);
      const cuisineMatch = r.cuisine_types.some((c) => c.toLowerCase().includes(q));
      const dishMatch = matchedDishRestIds.has(r.id);
      return nameMatch || cuisineMatch || dishMatch;
    });
  }

  // Filter by cuisine
  if (params.cuisine && params.cuisine !== 'All') {
    results = results.filter((r) =>
      r.cuisine_types.some((c) => c.toLowerCase() === params.cuisine!.toLowerCase())
    );
  }

  // Filter by Veg only
  if (params.vegOnly) {
    if (!isFallback) {
      try {
        const supabase = await createClient();
        const { data: vegItems } = await supabase
          .from('menu_items')
          .select('restaurant_id')
          .eq('is_veg', true);

        const vegRestIds = new Set(
          (vegItems as unknown as { restaurant_id: string }[] || []).map((v) => v.restaurant_id)
        );
        results = results.filter((r) => vegRestIds.has(r.id));
      } catch {
        // Fallback
        const vegRestIds = new Set(CANONICAL_ITEMS.filter((v) => v.is_veg).map((v) => v.restaurant_id));
        results = results.filter((r) => vegRestIds.has(r.id));
      }
    } else {
      const vegRestIds = new Set(CANONICAL_ITEMS.filter((v) => v.is_veg).map((v) => v.restaurant_id));
      results = results.filter((r) => vegRestIds.has(r.id));
    }
  }

  // Sort results
  const sortBy = params.sortBy || 'recommended';
  results.sort((a, b) => {
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    if (sortBy === 'delivery_time') {
      return a.delivery_time_min - b.delivery_time_min;
    }
    if (sortBy === 'delivery_fee') {
      return a.delivery_fee - b.delivery_fee;
    }
    if (sortBy === 'min_order') {
      return a.minimum_order - b.minimum_order;
    }
    // 'recommended' default: Open kitchens first, then highest rating
    if (a.is_accepting_orders !== b.is_accepting_orders) {
      return a.is_accepting_orders ? -1 : 1;
    }
    return b.rating - a.rating;
  });

  return {
    restaurants: results,
    error: dbError,
    isFallback,
  };
}

/**
 * Search across all food dishes with restaurant details
 */
export async function searchDishes(
  query: string,
  vegOnly: boolean = false
): Promise<DishSearchResult[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  try {
    const supabase = await createClient();
    let dishQuery = supabase
      .from('menu_items')
      .select('*, restaurants!inner(id, name, rating, total_reviews, delivery_fee, delivery_time_min, delivery_time_max, is_accepting_orders, is_active)')
      .eq('restaurants.is_active', true)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`);

    if (vegOnly) {
      dishQuery = dishQuery.eq('is_veg', true);
    }

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Search timed out')), 4000)
    );

    const { data, error } = await Promise.race([dishQuery, timeoutPromise]);
    if (error) {
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data as any[]) || []).map((row) => ({
      id: row.id,
      restaurant_id: row.restaurant_id,
      category_id: row.category_id,
      name: row.name,
      description: row.description,
      price: row.price,
      image_url: row.image_url,
      is_veg: row.is_veg,
      is_available: row.is_available,
      preparation_time_minutes: row.preparation_time_minutes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      restaurant: {
        id: row.restaurants.id,
        name: row.restaurants.name,
        rating: row.restaurants.rating,
        total_reviews: row.restaurants.total_reviews,
        delivery_fee: row.restaurants.delivery_fee,
        delivery_time_min: row.restaurants.delivery_time_min,
        delivery_time_max: row.restaurants.delivery_time_max,
        is_accepting_orders: row.restaurants.is_accepting_orders,
      },
    }));
  } catch (err) {
    console.error('Error searching dishes in database:', err);

    if (!isDevFallbackEnabled()) {
      return [];
    }

    // Fallback to canonical seed items only in explicit development mode
    const restMap = new Map(CANONICAL_RESTAURANTS.map((r) => [r.id, r]));
    return CANONICAL_ITEMS
      .filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
        const matchesVeg = vegOnly ? item.is_veg : true;
        return matchesQuery && matchesVeg;
      })
      .map((item) => {
        const rest = restMap.get(item.restaurant_id) || CANONICAL_RESTAURANTS[0];
        return {
          ...item,
          restaurant: {
            id: rest.id,
            name: rest.name,
            rating: rest.rating,
            total_reviews: rest.total_reviews,
            delivery_fee: rest.delivery_fee,
            delivery_time_min: rest.delivery_time_min,
            delivery_time_max: rest.delivery_time_max,
            is_accepting_orders: rest.is_accepting_orders,
          },
        };
      });
  }
}

/**
 * Get restaurant details, categorized menu, and operating hours for customer restaurant page
 * Optimized: Runs parallel fetching of categories, menu items, and operating hours
 */
export async function getRestaurantWithMenu(restaurantId: string) {
  try {
    const supabase = await createClient();

    // 1. Fetch restaurant with fast timeout
    const queryPromise = supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Restaurant lookup timed out')), 2500)
    );

    const { data: restaurant, error: restError } = await Promise.race([queryPromise, timeoutPromise]);

    if (restError || !restaurant) {
      throw new Error(restError?.message || 'Restaurant not found');
    }

    // 2. Fetch categories, items, and hours in PARALLEL via Promise.all
    const [categoriesRes, itemsRes, hoursRes] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true }),
      supabase
        .from('restaurant_hours')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('day_of_week', { ascending: true }),
    ]);

    return {
      restaurant: restaurant as unknown as Restaurant,
      categories: (categoriesRes.data as unknown as MenuCategory[]) || [],
      items: (itemsRes.data as unknown as MenuItem[]) || [],
      hours: (hoursRes.data as unknown as Tables<'restaurant_hours'>[]) || [],
    };
  } catch (err) {
    console.error(`Error loading restaurant with menu (${restaurantId}):`, err);

    // Fallback to canonical seed data only in explicit development mode
    if (isDevFallbackEnabled()) {
      const canonRest = CANONICAL_RESTAURANTS.find((r) => r.id === restaurantId);
      if (canonRest) {
        const canonCategories = CANONICAL_CATEGORIES.filter((c) => c.restaurant_id === restaurantId);
        const canonItems = CANONICAL_ITEMS.filter((i) => i.restaurant_id === restaurantId);
        const canonHours = CANONICAL_HOURS.filter((h) => h.restaurant_id === restaurantId);
        return {
          restaurant: canonRest,
          categories: canonCategories,
          items: canonItems,
          hours: canonHours,
        };
      }
    }

    return null;
  }
}
