'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Cart, CartItem, MenuItem, Restaurant, Coupon } from '@/types/database.types';

export interface DetailedCartItem extends CartItem {
  menu_item: MenuItem;
}

export interface DetailedCart extends Cart {
  restaurant: Restaurant | null;
  items: DetailedCartItem[];
  subtotal: number;
  item_count: number;
}

export type CartActionResponse = {
  success: boolean;
  conflict?: boolean;
  existingRestaurantName?: string;
  newRestaurantName?: string;
  message?: string;
  error?: string;
  data?: DetailedCart | null;
};

/**
 * Get or initialize customer cart with joined items and restaurant details
 */
export async function getCart(): Promise<DetailedCart | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Ensure cart exists for user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cartData } = await (supabase.from('carts') as any)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let cart = cartData as Cart | null;

  if (!cart) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCart } = await (supabase.from('carts') as any)
      .insert({ user_id: user.id })
      .select()
      .single();
    cart = newCart as Cart;
  }

  if (!cart) return null;

  // Fetch cart items with menu item details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase.from('cart_items') as any)
    .select('*, menu_item:menu_items(*)')
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: true });

  // Fetch restaurant if assigned
  let restaurant: Restaurant | null = null;
  if (cart.restaurant_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rest } = await (supabase.from('restaurants') as any)
      .select('*')
      .eq('id', cart.restaurant_id)
      .maybeSingle();
    restaurant = rest as unknown as Restaurant | null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detailedItems: DetailedCartItem[] = ((items as any[]) || []).map((row) => ({
    id: row.id,
    cart_id: row.cart_id,
    menu_item_id: row.menu_item_id,
    quantity: row.quantity,
    special_instructions: row.special_instructions,
    created_at: row.created_at,
    updated_at: row.updated_at,
    menu_item: row.menu_item as MenuItem,
  }));

  const subtotal = detailedItems.reduce((acc, item) => {
    return acc + item.quantity * (item.menu_item?.price || 0);
  }, 0);

  const itemCount = detailedItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    ...cart,
    restaurant,
    items: detailedItems,
    subtotal,
    item_count: itemCount,
  };
}

/**
 * Add food item to cart with single-restaurant conflict enforcement
 */
export async function addToCart(
  restaurantId: string,
  menuItemId: string,
  quantity: number = 1
): Promise<CartActionResponse> {
  if (quantity <= 0) {
    return { success: false, error: 'Quantity must be at least 1.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Please sign in to add items to your cart.' };
  }

  // 1. Verify menu item exists, is available, and belongs to the restaurant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemData } = await (supabase.from('menu_items') as any)
    .select('*')
    .eq('id', menuItemId)
    .eq('restaurant_id', restaurantId)
    .single();

  const menuItem = itemData as MenuItem | null;

  if (!menuItem) {
    return { success: false, error: 'The selected dish could not be found.' };
  }

  if (!menuItem.is_available) {
    return { success: false, error: 'This dish is currently out of stock.' };
  }

  // 2. Verify restaurant is accepting orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: restData } = await (supabase.from('restaurants') as any)
    .select('id, name, is_accepting_orders, is_active')
    .eq('id', restaurantId)
    .single();

  const newRest = restData as Restaurant | null;

  if (!newRest || !newRest.is_active || !newRest.is_accepting_orders) {
    return { success: false, error: 'This restaurant is currently closed or not accepting orders.' };
  }

  // 3. Get or initialize customer cart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cartData } = await (supabase.from('carts') as any)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let cart = cartData as Cart | null;

  if (!cart) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCart } = await (supabase.from('carts') as any)
      .insert({ user_id: user.id })
      .select()
      .single();
    cart = newCart as Cart;
  }

  if (!cart) return { success: false, error: 'Could not initialize cart.' };

  // 4. Check if cart already has items from another restaurant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: currentItemCount } = await (supabase.from('cart_items') as any)
    .select('*', { count: 'exact', head: true })
    .eq('cart_id', cart.id);

  if (currentItemCount && currentItemCount > 0 && cart.restaurant_id && cart.restaurant_id !== restaurantId) {
    // Conflict detected!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRest } = await (supabase.from('restaurants') as any)
      .select('name')
      .eq('id', cart.restaurant_id)
      .single();

    return {
      success: false,
      conflict: true,
      existingRestaurantName: (existingRest as { name: string } | null)?.name || 'another restaurant',
      newRestaurantName: newRest.name,
      message: 'Your cart contains items from another restaurant. Do you want to clear your cart and continue?',
    };
  }

  // 5. Update restaurant_id on cart if unset
  if (!cart.restaurant_id || cart.restaurant_id !== restaurantId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('carts') as any)
      .update({ restaurant_id: restaurantId })
      .eq('id', cart.id);
  }

  // 6. Upsert cart item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingItem } = await (supabase.from('cart_items') as any)
    .select('id, quantity')
    .eq('cart_id', cart.id)
    .eq('menu_item_id', menuItemId)
    .maybeSingle();

  if (existingItem) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cart_items') as any)
      .update({ quantity: (existingItem as { quantity: number; id: string }).quantity + quantity })
      .eq('id', (existingItem as { id: string }).id);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cart_items') as any).insert({
      cart_id: cart.id,
      menu_item_id: menuItemId,
      quantity,
    });
  }

  revalidatePath('/cart');
  revalidatePath('/checkout');
  return { success: true, message: `Added ${menuItem.name} to cart.` };
}

/**
 * Clear existing items and add new item (used when user confirms restaurant switch)
 */
export async function clearAndAddToCart(
  restaurantId: string,
  menuItemId: string,
  quantity: number = 1
): Promise<CartActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cart } = await (supabase.from('carts') as any)
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (cart) {
    // Delete all existing items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cart_items') as any).delete().eq('cart_id', (cart as { id: string }).id);

    // Reset restaurant_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('carts') as any)
      .update({ restaurant_id: restaurantId })
      .eq('id', (cart as { id: string }).id);
  }

  // Now add the new item
  return await addToCart(restaurantId, menuItemId, quantity);
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<CartActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  if (quantity <= 0) {
    return await removeCartItem(cartItemId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('cart_items') as any)
    .update({ quantity })
    .eq('id', cartItemId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/cart');
  revalidatePath('/checkout');
  return { success: true };
}

/**
 * Remove an item from the cart
 */
export async function removeCartItem(cartItemId: string): Promise<CartActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Get cart_id before deleting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item } = await (supabase.from('cart_items') as any)
    .select('cart_id')
    .eq('id', cartItemId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('cart_items') as any).delete().eq('id', cartItemId);
  if (error) return { success: false, error: error.message };

  // If no items remain, reset restaurant_id on the cart
  if (item) {
    const itemData = item as { cart_id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from('cart_items') as any)
      .select('*', { count: 'exact', head: true })
      .eq('cart_id', itemData.cart_id);

    if (!count || count === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('carts') as any)
        .update({ restaurant_id: null })
        .eq('id', itemData.cart_id);
    }
  }

  revalidatePath('/cart');
  revalidatePath('/checkout');
  return { success: true, message: 'Item removed from cart.' };
}

/**
 * Clear all items in customer's cart
 */
export async function clearCart(): Promise<CartActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cart } = await (supabase.from('carts') as any)
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (cart) {
    const cartId = (cart as { id: string }).id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cart_items') as any).delete().eq('cart_id', cartId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('carts') as any)
      .update({ restaurant_id: null })
      .eq('id', cartId);
  }

  revalidatePath('/cart');
  revalidatePath('/checkout');
  return { success: true, message: 'Cart cleared.' };
}

/**
 * Validate a promotional coupon code against the current subtotal
 */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<{
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  error?: string;
  }> {
  if (!code || !code.trim()) {
    return { valid: false, discountAmount: 0, error: 'Please enter a coupon code.' };
  }

  const supabase = await createClient();
  const cleanCode = code.trim().toUpperCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: couponData, error } = await (supabase.from('coupons') as any)
    .select('*')
    .eq('code', cleanCode)
    .eq('is_active', true)
    .maybeSingle();

  const coupon = couponData as Coupon | null;

  if (error || !coupon) {
    return { valid: false, discountAmount: 0, error: 'Invalid or expired coupon code.' };
  }

  // Check validity dates
  const now = new Date();
  if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
    return { valid: false, discountAmount: 0, error: 'This coupon has expired.' };
  }

  // Check minimum order amount
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Add items worth ₹${(coupon.min_order_amount - subtotal).toFixed(2)} more to apply ${coupon.code}.`,
    };
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discount_type === 'FIXED') {
    discount = coupon.discount_value;
  } else if (coupon.discount_type === 'PERCENTAGE') {
    discount = (subtotal * coupon.discount_value) / 100;
    if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }
  }

  discount = Math.min(discount, subtotal); // Discount cannot exceed food subtotal

  return {
    valid: true,
    coupon: coupon as unknown as Coupon,
    discountAmount: Math.round(discount * 100) / 100,
  };
}
