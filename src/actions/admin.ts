'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  Profile,
  Restaurant,
  Order,
  Coupon,
  OrderStatus,
  PaymentStatus,
} from '@/types/database.types';

export type AdminActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Strict server-side Admin verification guard
 */
export async function verifyAdmin(): Promise<{ user: { id: string }; profile: Profile } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profileData || profileData.role !== 'ADMIN') {
    return null;
  }

  return { user, profile: profileData as Profile };
}

/**
 * 1. REAL PLATFORM METRICS & ANALYTICS
 */
export interface AdminMetrics {
  totalCustomers: number;
  totalRestaurants: number;
  activeRestaurants: number;
  suspendedRestaurants: number;
  totalOrders: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  grossOrderValue: number;
  platformRevenue: number;
  restaurantEarnings: number;
  averageOrderValue: number;
  cancelledOrders: number;
  deliveredOrders: number;
}

export async function getAdminMetrics(range: 'today' | '7days' | '30days' | 'all' = 'all'): Promise<AdminMetrics | null> {
  const admin = await verifyAdmin();
  if (!admin) return null;

  const supabase = await createClient();

  // Set up time boundaries
  const now = new Date();
  let startDate: Date | null = null;

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === '7days') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '30days') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ordersQuery = (supabase.from('orders') as any).select('*');
  if (startDate) {
    ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
  }

  // Execute all metric queries in PARALLEL to reduce latency
  const [
    customerRes,
    restaurantsRes,
    ordersRes,
    todayRes,
    weekRes,
    monthRes,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }).eq('role', 'CUSTOMER'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('restaurants') as any).select('id, is_active'),
    ordersQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('orders') as any).select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('orders') as any).select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('orders') as any).select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
  ]);

  const customerCount = customerRes.count || 0;
  const restaurants = restaurantsRes.data || [];
  const totalRestaurants = restaurants.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeRestaurants = restaurants.filter((r: any) => r.is_active).length;
  const suspendedRestaurants = totalRestaurants - activeRestaurants;

  const orders: Order[] = ordersRes.data || [];
  const todayCount = todayRes.count || 0;
  const weekCount = weekRes.count || 0;
  const monthCount = monthRes.count || 0;

  // Financial aggregates (excluding cancelled/refunded from GMV)
  const validOrders = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
  const grossOrderValue = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalSubtotal = validOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

  // Platform Commission standard: 15% of food subtotal
  const platformRevenue = Math.round(totalSubtotal * 0.15 * 100) / 100;
  const taxSum = validOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0);
  const restaurantEarnings = Math.max(0, Math.round((grossOrderValue - platformRevenue - taxSum) * 100) / 100);

  const averageOrderValue =
    validOrders.length > 0 ? Math.round((grossOrderValue / validOrders.length) * 100) / 100 : 0;

  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED').length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;

  return {
    totalCustomers: customerCount || 0,
    totalRestaurants,
    activeRestaurants,
    suspendedRestaurants,
    totalOrders: orders.length,
    todayOrders: todayCount || 0,
    weekOrders: weekCount || 0,
    monthOrders: monthCount || 0,
    grossOrderValue: Math.round(grossOrderValue * 100) / 100,
    platformRevenue,
    restaurantEarnings,
    averageOrderValue,
    cancelledOrders,
    deliveredOrders,
  };
}

/**
 * 2. RESTAURANT MANAGEMENT
 */
export interface AdminRestaurantDetails extends Restaurant {
  owner: Profile;
  order_count: number;
  total_revenue: number;
}

export async function getAdminRestaurants(
  searchQuery?: string,
  filterStatus?: 'all' | 'active' | 'suspended'
): Promise<AdminRestaurantDetails[]> {
  const admin = await verifyAdmin();
  if (!admin) return [];

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('restaurants') as any)
    .select('*, owner:profiles(*)')
    .order('created_at', { ascending: false });

  if (filterStatus === 'active') {
    query = query.eq('is_active', true);
  } else if (filterStatus === 'suspended') {
    query = query.eq('is_active', false);
  }

  const { data: restaurants, error } = await query;
  if (error || !restaurants) return [];

  // Fetch orders count per restaurant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allOrders } = await (supabase.from('orders') as any).select('restaurant_id, total_amount, status');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: AdminRestaurantDetails[] = restaurants.map((r: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rOrders = (allOrders || []).filter((o: any) => o.restaurant_id === r.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rValidOrders = rOrders.filter((o: any) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalRev = rValidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

    return {
      ...r,
      owner: r.owner as Profile,
      order_count: rOrders.length,
      total_revenue: Math.round(totalRev * 100) / 100,
    };
  });

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.owner?.full_name?.toLowerCase().includes(q) ||
        r.owner?.email?.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function toggleRestaurantActive(
  restaurantId: string,
  isActive: boolean
): Promise<AdminActionResponse> {
  const admin = await verifyAdmin();
  if (!admin) return { success: false, error: 'Unauthorized. Admin access required.' };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('restaurants') as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', restaurantId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/restaurants');
  revalidatePath('/admin/dashboard');
  revalidatePath('/restaurants');
  return {
    success: true,
    message: `Restaurant has been ${isActive ? 'reactivated' : 'suspended'} successfully.`,
  };
}

/**
 * 3. CUSTOMER MANAGEMENT
 */
export interface AdminCustomerDetails extends Profile {
  order_count: number;
  total_spent: number;
}

export async function getAdminCustomers(searchQuery?: string): Promise<AdminCustomerDetails[]> {
  const admin = await verifyAdmin();
  if (!admin) return [];

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('role', 'CUSTOMER')
    .order('created_at', { ascending: false });

  if (error || !profiles) return [];

  // Fetch orders count & spend per customer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allOrders } = await (supabase.from('orders') as any).select('customer_id, total_amount, status');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: AdminCustomerDetails[] = profiles.map((p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userOrders = (allOrders || []).filter((o: any) => o.customer_id === p.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validOrders = userOrders.filter((o: any) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalSpent = validOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

    return {
      ...p,
      order_count: userOrders.length,
      total_spent: Math.round(totalSpent * 100) / 100,
    };
  });

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }

  return result;
}

export async function toggleCustomerActive(
  customerId: string,
  isActive: boolean
): Promise<AdminActionResponse> {
  const admin = await verifyAdmin();
  if (!admin) return { success: false, error: 'Unauthorized. Admin access required.' };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', customerId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/customers');
  revalidatePath('/admin/dashboard');
  return {
    success: true,
    message: `Customer account has been ${isActive ? 'reactivated' : 'suspended'}.`,
  };
}

/**
 * 4. ORDER MANAGEMENT
 */
export interface AdminOrderRow extends Order {
  customer: Profile;
  restaurant: Restaurant;
  items_count: number;
}

export async function getAdminOrders(params: {
  search?: string;
  status?: OrderStatus | 'ALL';
  paymentStatus?: PaymentStatus | 'ALL';
}): Promise<AdminOrderRow[]> {
  const admin = await verifyAdmin();
  if (!admin) return [];

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('orders') as any)
    .select('*, customer:profiles(*), restaurant:restaurants(*), order_items(id)')
    .order('created_at', { ascending: false });

  if (params.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }

  const { data: orders, error } = await query;
  if (error || !orders) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: AdminOrderRow[] = orders.map((o: any) => ({
    ...o,
    customer: o.customer as Profile,
    restaurant: o.restaurant as Restaurant,
    items_count: o.order_items?.length || 0,
  }));

  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    result = result.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer?.full_name?.toLowerCase().includes(q) ||
        o.restaurant?.name?.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * 5. COUPON MANAGEMENT
 */
export async function getAdminCoupons(): Promise<Coupon[]> {
  const admin = await verifyAdmin();
  if (!admin) return [];

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('coupons') as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Coupon[];
}

export async function createAdminCoupon(formData: FormData): Promise<AdminActionResponse> {
  const admin = await verifyAdmin();
  if (!admin) return { success: false, error: 'Unauthorized.' };

  const code = (formData.get('code') as string)?.trim().toUpperCase();
  const description = (formData.get('description') as string)?.trim();
  const discountType = formData.get('discountType') as 'PERCENTAGE' | 'FIXED';
  const discountValue = Number(formData.get('discountValue'));
  const minOrderAmount = Number(formData.get('minOrderAmount')) || 0;
  const maxDiscountAmount = formData.get('maxDiscountAmount')
    ? Number(formData.get('maxDiscountAmount'))
    : null;
  const validUntilStr = formData.get('validUntil') as string;

  // Server-side validation
  if (!code || code.length < 3) {
    return { success: false, error: 'Coupon code must be at least 3 characters.' };
  }
  if (discountValue <= 0) {
    return { success: false, error: 'Discount value must be greater than 0.' };
  }
  if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 100)) {
    return { success: false, error: 'Percentage discount must be between 1% and 100%.' };
  }
  if (!validUntilStr) {
    return { success: false, error: 'Expiry date is required.' };
  }

  const validUntil = new Date(validUntilStr);
  if (validUntil <= new Date()) {
    return { success: false, error: 'Expiry date must be in the future.' };
  }

  const supabase = await createClient();

  // Check uniqueness
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('coupons') as any)
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Coupon code "${code}" already exists.` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase.from('coupons') as any).insert({
    code,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_amount: minOrderAmount,
    max_discount_amount: maxDiscountAmount,
    valid_from: new Date().toISOString(),
    valid_until: validUntil.toISOString(),
    is_active: true,
  });

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath('/admin/coupons');
  return { success: true, message: `Coupon "${code}" created successfully.` };
}

export async function toggleCouponActive(
  couponId: string,
  isActive: boolean
): Promise<AdminActionResponse> {
  const admin = await verifyAdmin();
  if (!admin) return { success: false, error: 'Unauthorized.' };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('coupons') as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', couponId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/coupons');
  return { success: true };
}

/**
 * 6. PLATFORM SETTINGS
 */
export interface PlatformSettingsMap {
  tax_percentage: number;
  delivery_fee_base: number;
  platform_commission_percent: number;
  minimum_order_value: number;
  platform_name: string;
  maintenance_mode: boolean;
}

export async function getPlatformSettings(): Promise<PlatformSettingsMap> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('platform_settings') as any).select('*');

  const defaults: PlatformSettingsMap = {
    tax_percentage: 5.0,
    delivery_fee_base: 35.0,
    platform_commission_percent: 15.0,
    minimum_order_value: 99.0,
    platform_name: 'QuickBite India',
    maintenance_mode: false,
  };

  if (!data) return defaults;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.forEach((row: any) => {
    if (row.key === 'tax_percentage') defaults.tax_percentage = Number(row.value);
    if (row.key === 'delivery_fee_base') defaults.delivery_fee_base = Number(row.value);
    if (row.key === 'platform_commission_percent') defaults.platform_commission_percent = Number(row.value);
    if (row.key === 'minimum_order_value') defaults.minimum_order_value = Number(row.value);
    if (row.key === 'platform_name') defaults.platform_name = String(row.value);
    if (row.key === 'maintenance_mode') defaults.maintenance_mode = Boolean(row.value);
  });

  return defaults;
}

export async function updatePlatformSetting(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
): Promise<AdminActionResponse> {
  const admin = await verifyAdmin();
  if (!admin) return { success: false, error: 'Unauthorized.' };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('platform_settings') as any).upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/settings');
  revalidatePath('/admin/dashboard');
  return { success: true, message: 'Platform settings updated successfully.' };
}

/**
 * 8. ADMIN PAYMENT TRANSACTIONS AUDIT
 */
export interface AdminPaymentRecord {
  id: string;
  order_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  error_code: string | null;
  error_description: string | null;
  created_at: string;
  order?: {
    order_number: string;
    total_amount: number;
    customer?: {
      full_name: string;
      email: string;
    };
    restaurant?: {
      name: string;
    };
  };
}

export async function getAdminPaymentsAction(params?: {
  status?: string;
  search?: string;
}): Promise<AdminActionResponse<AdminPaymentRecord[]>> {
  const admin = await verifyAdmin();
  if (!admin) return { success: false, error: 'Unauthorized: Admin privileges required.' };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('payments') as any)
    .select(`
      *,
      order:orders(
        order_number,
        total_amount,
        customer:profiles!customer_id(full_name, email),
        restaurant:restaurants(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (params?.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;
  if (error) {
    return { success: false, error: error.message };
  }

  let payments = (data || []) as AdminPaymentRecord[];

  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    payments = payments.filter(
      (p) =>
        p.order?.order_number?.toLowerCase().includes(q) ||
        p.razorpay_payment_id?.toLowerCase().includes(q) ||
        p.razorpay_order_id?.toLowerCase().includes(q) ||
        p.order?.customer?.full_name?.toLowerCase().includes(q) ||
        p.order?.customer?.email?.toLowerCase().includes(q) ||
        p.order?.restaurant?.name?.toLowerCase().includes(q)
    );
  }

  return { success: true, data: payments };
}

