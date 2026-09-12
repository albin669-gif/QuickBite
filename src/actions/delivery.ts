'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { DeliveryAssignment, DeliveryStatus, OrderStatus } from '@/types/database.types';
import { createNotificationIdempotent } from './notification';

export interface DriverDeliveryDetails extends DeliveryAssignment {
  order: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    subtotal: number;
    delivery_fee: number;
    customer_notes: string | null;
    created_at: string;
    delivery_address_snapshot: {
      address_line1: string;
      address_line2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      landmark?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    };
    customer: {
      full_name: string;
      phone: string | null;
    };
    restaurant: {
      id: string;
      name: string;
      address: string;
      city: string;
      phone: string | null;
      logo_url: string | null;
    };
    items: {
      id: string;
      item_name: string;
      quantity: number;
    }[];
  };
}

export interface AvailableOrderForDelivery {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string | null;
  };
  delivery_address_snapshot: {
    address_line1: string;
    city: string;
    postal_code: string;
    landmark?: string | null;
  };
  item_count: number;
}

export interface DeliveryActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * 1. Get currently available orders waiting for a delivery partner
 * (Orders that are READY_FOR_PICKUP or PREPARING and don't yet have an active driver assignment)
 */
export async function getAvailableDeliveriesAction(): Promise<AvailableOrderForDelivery[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'DELIVERY_PARTNER' && profile?.role !== 'ADMIN') {
    return [];
  }

  // Get orders that are READY_FOR_PICKUP or PREPARING
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersData, error } = await (supabase.from('orders') as any)
    .select(
      `
      id,
      order_number,
      status,
      total_amount,
      delivery_address_snapshot,
      created_at,
      restaurant:restaurants(id, name, address, city, phone),
      order_items(id)
    `
    )
    .in('status', ['READY_FOR_PICKUP', 'PREPARING'])
    .order('created_at', { ascending: false });

  if (error || !ordersData) {
    return [];
  }

  // Find which of these orders already have an active (non-delivered) delivery assignment
  const orderIds = ordersData.map((o: { id: string }) => o.id);
  if (orderIds.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAssignments } = await (supabase.from('delivery_assignments') as any)
    .select('order_id, status, driver_id')
    .in('order_id', orderIds);

  const assignedOrderIds = new Set(
    (existingAssignments || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.driver_id !== null && a.status !== 'DELIVERED')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => a.order_id)
  );

  // Filter only unassigned orders
  return ordersData
    .filter((order: { id: string }) => !assignedOrderIds.has(order.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status as OrderStatus,
      total_amount: Number(order.total_amount),
      created_at: order.created_at,
      restaurant: order.restaurant,
      delivery_address_snapshot: order.delivery_address_snapshot,
      item_count: order.order_items ? order.order_items.length : 0,
    }));
}

/**
 * 2. Get the active delivery assignment for the currently authenticated delivery partner
 */
export async function getActiveDriverDeliveryAction(): Promise<DriverDeliveryDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Find assignment where driver_id = user.id and status != 'DELIVERED'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignmentData, error } = await (supabase.from('delivery_assignments') as any)
    .select('*')
    .eq('driver_id', user.id)
    .neq('status', 'DELIVERED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !assignmentData) {
    return null;
  }

  // Fetch full order details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderData } = await (supabase.from('orders') as any)
    .select(
      `
      id,
      order_number,
      status,
      total_amount,
      subtotal,
      delivery_fee,
      customer_notes,
      delivery_address_snapshot,
      created_at,
      customer:profiles!customer_id(full_name, phone),
      restaurant:restaurants(id, name, address, city, phone, logo_url),
      order_items(id, item_name, quantity)
    `
    )
    .eq('id', assignmentData.order_id)
    .single();

  if (!orderData) {
    return null;
  }

  return {
    ...(assignmentData as DeliveryAssignment),
    order: {
      id: orderData.id,
      order_number: orderData.order_number,
      status: orderData.status as OrderStatus,
      total_amount: Number(orderData.total_amount),
      subtotal: Number(orderData.subtotal),
      delivery_fee: Number(orderData.delivery_fee),
      customer_notes: orderData.customer_notes,
      created_at: orderData.created_at,
      delivery_address_snapshot: orderData.delivery_address_snapshot,
      customer: orderData.customer || { full_name: 'Customer', phone: null },
      restaurant: orderData.restaurant,
      items: orderData.order_items || [],
    },
  };
}

/**
 * 3. Driver claims an available order
 */
export async function claimDeliveryOrderAction(orderId: string): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Verify driver profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'DELIVERY_PARTNER' && profile.role !== 'ADMIN')) {
    return { success: false, error: 'Only delivery partners can accept delivery assignments.' };
  }

  // Verify driver doesn't already have an active in-progress assignment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingActive } = await (supabase.from('delivery_assignments') as any)
    .select('id, order_id')
    .eq('driver_id', user.id)
    .neq('status', 'DELIVERED')
    .maybeSingle();

  if (existingActive) {
    return {
      success: false,
      error: 'You already have an active delivery task in progress. Complete it first.',
    };
  }

  // Check if order exists and is eligible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderData } = await (supabase.from('orders') as any)
    .select('id, order_number, customer_id, restaurant_id, status')
    .eq('id', orderId)
    .single();

  if (!orderData) {
    return { success: false, error: 'Order not found.' };
  }

  if (orderData.status === 'CANCELLED' || orderData.status === 'DELIVERED') {
    return { success: false, error: 'This order is no longer available for delivery.' };
  }

  // Check if already claimed by someone else
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderAssignment } = await (supabase.from('delivery_assignments') as any)
    .select('id, driver_id, status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (orderAssignment && orderAssignment.driver_id && orderAssignment.driver_id !== user.id) {
    return { success: false, error: 'This order was already claimed by another driver.' };
  }

  const now = new Date().toISOString();

  if (orderAssignment) {
    // Update existing row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('delivery_assignments') as any)
      .update({
        driver_id: user.id,
        driver_name: profile.full_name,
        driver_phone: profile.phone || null,
        status: 'ASSIGNED',
        assigned_at: now,
        updated_at: now,
      })
      .eq('id', orderAssignment.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    // Create new assignment row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('delivery_assignments') as any)
      .insert({
        order_id: orderId,
        driver_id: user.id,
        driver_name: profile.full_name,
        driver_phone: profile.phone || null,
        vehicle_details: 'Standard Delivery Partner Vehicle',
        status: 'ASSIGNED',
        assigned_at: now,
        created_at: now,
        updated_at: now,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  // Notify customer that driver has been assigned
  await createNotificationIdempotent({
    userId: orderData.customer_id,
    orderId: orderData.id,
    type: 'ORDER',
    title: `Delivery Partner Assigned #${orderData.order_number}`,
    message: `${profile.full_name} has accepted your delivery and will pick up your meal shortly.`,
  });

  revalidatePath('/driver/dashboard');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/admin/deliveries');

  return {
    success: true,
    message: 'Delivery order successfully accepted! Head to the restaurant.',
  };
}

/**
 * 4. Driver updates delivery status:
 * 'ARRIVED_AT_RESTAURANT' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
 */
export async function updateDeliveryStatusAction(
  orderId: string,
  newDeliveryStatus: DeliveryStatus
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Check assignment ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignment } = await (supabase.from('delivery_assignments') as any)
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (!assignment) {
    return { success: false, error: 'Delivery assignment not found.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  const isDriver = assignment.driver_id === user.id;
  const isAdmin = profile?.role === 'ADMIN';

  if (!isDriver && !isAdmin) {
    return { success: false, error: 'You are not authorized to update this delivery.' };
  }

  // Fetch the order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderData } = await (supabase.from('orders') as any)
    .select('id, order_number, customer_id, restaurant_id, status')
    .eq('id', orderId)
    .single();

  if (!orderData) {
    return { success: false, error: 'Order not found.' };
  }

  const now = new Date().toISOString();
  const assignmentUpdate: Partial<DeliveryAssignment> = {
    status: newDeliveryStatus,
    updated_at: now,
  };

  // Sync with orders table status
  let mappedOrderStatus: OrderStatus | null = null;

  if (newDeliveryStatus === 'ARRIVED_AT_RESTAURANT') {
    // Delivery partner has reached kitchen
  } else if (newDeliveryStatus === 'PICKED_UP' || newDeliveryStatus === 'OUT_FOR_DELIVERY') {
    mappedOrderStatus = 'OUT_FOR_DELIVERY';
    assignmentUpdate.picked_up_at = assignment.picked_up_at || now;
  } else if (newDeliveryStatus === 'DELIVERED') {
    mappedOrderStatus = 'DELIVERED';
    assignmentUpdate.delivered_at = now;
  }

  // Update delivery assignment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: assignmentError } = await (supabase.from('delivery_assignments') as any)
    .update(assignmentUpdate)
    .eq('id', assignment.id);

  if (assignmentError) {
    return { success: false, error: assignmentError.message };
  }

  // Update order status if mapped
  if (mappedOrderStatus && orderData.status !== mappedOrderStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({
        status: mappedOrderStatus,
        updated_at: now,
      })
      .eq('id', orderId);

    // Send notifications to customer
    if (mappedOrderStatus === 'OUT_FOR_DELIVERY') {
      await createNotificationIdempotent({
        userId: orderData.customer_id,
        orderId: orderData.id,
        type: 'ORDER',
        title: `Out for Delivery #${orderData.order_number}`,
        message: `${assignment.driver_name || 'Your delivery partner'} has picked up your food and is on the way!`,
      });
    } else if (mappedOrderStatus === 'DELIVERED') {
      await createNotificationIdempotent({
        userId: orderData.customer_id,
        orderId: orderData.id,
        type: 'ORDER',
        title: `Order Delivered #${orderData.order_number}`,
        message: 'Your order has been delivered at your doorstep. Enjoy your meal!',
      });
    }
  }

  revalidatePath('/driver/dashboard');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  revalidatePath('/restaurant/orders');
  revalidatePath('/admin/deliveries');

  return {
    success: true,
    message: `Delivery status updated to ${newDeliveryStatus.replace(/_/g, ' ')}.`,
  };
}

/**
 * 5. Driver broadcasts real device GPS coordinates:
 * Persists to delivery_assignments table and triggers Supabase Realtime update
 */
export async function broadcastDriverLocationAction(params: {
  orderId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
}): Promise<DeliveryActionResult> {
  const { orderId, latitude, longitude, heading } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Validation: valid real coordinates
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { success: false, error: 'Invalid GPS coordinates provided.' };
  }

  // Verify driver assignment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignment } = await (supabase.from('delivery_assignments') as any)
    .select('id, driver_id, status, last_location_updated_at')
    .eq('order_id', orderId)
    .single();

  if (!assignment || assignment.driver_id !== user.id) {
    return { success: false, error: 'Unauthorized to broadcast location for this delivery.' };
  }

  // Only broadcast while active
  if (assignment.status === 'DELIVERED') {
    return { success: false, error: 'Order is already delivered.' };
  }

  // Rate Limiting: Minimum 3 seconds between GPS writes to prevent DB thrashing
  if (assignment.last_location_updated_at) {
    const elapsedMs = Date.now() - new Date(assignment.last_location_updated_at).getTime();
    if (elapsedMs < 3000) {
      return { success: true, message: 'Throttled: Location update received within 3s delta.' };
    }
  }

  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('delivery_assignments') as any)
    .update({
      current_latitude: latitude,
      current_longitude: longitude,
      heading: typeof heading === 'number' && !isNaN(heading) ? heading : null,
      last_location_updated_at: now,
      updated_at: now,
    })
    .eq('id', assignment.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * 6. Get delivery tracking state for customer view
 */
export async function getOrderDeliveryTrackingAction(orderId: string): Promise<{
  assignment: DeliveryAssignment | null;
  restaurantLocation: { name: string; address: string; city: string } | null;
  deliveryLocation: {
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}> {
  const supabase = await createClient();

  const [assignmentRes, orderRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('delivery_assignments') as any)
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('orders') as any)
      .select('restaurant:restaurants(name, address, city), delivery_address_snapshot')
      .eq('id', orderId)
      .single(),
  ]);

  return {
    assignment: (assignmentRes.data as DeliveryAssignment) || null,
    restaurantLocation: orderRes.data?.restaurant || null,
    deliveryLocation: orderRes.data?.delivery_address_snapshot || null,
  };
}

/**
 * 7. Admin query: List all active & recent delivery assignments
 */
export async function getAllDeliveriesAdminAction(): Promise<
  (DeliveryAssignment & {
    order_number: string;
    restaurant_name: string;
    customer_name: string;
  })[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADMIN') {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments, error } = await (supabase.from('delivery_assignments') as any)
    .select(
      `
      *,
      order:orders(
        order_number,
        restaurant:restaurants(name),
        customer:profiles!customer_id(full_name)
      )
    `
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error || !assignments) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assignments.map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    driver_id: row.driver_id,
    driver_name: row.driver_name,
    driver_phone: row.driver_phone,
    vehicle_details: row.vehicle_details,
    status: row.status,
    assigned_at: row.assigned_at,
    picked_up_at: row.picked_up_at,
    delivered_at: row.delivered_at,
    current_latitude: row.current_latitude ? Number(row.current_latitude) : null,
    current_longitude: row.current_longitude ? Number(row.current_longitude) : null,
    heading: row.heading ? Number(row.heading) : null,
    last_location_updated_at: row.last_location_updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_number: row.order?.order_number || 'N/A',
    restaurant_name: row.order?.restaurant?.name || 'Unknown Kitchen',
    customer_name: row.order?.customer?.full_name || 'Customer',
  }));
}
