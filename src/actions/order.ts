'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Order, OrderItem, OrderStatus, PaymentStatus, Restaurant, Coupon, Address } from '@/types/database.types';
import { createNotificationIdempotent } from './notification';

export interface OrderWithDetails extends Order {
  restaurant: Restaurant;
  items: (OrderItem & { image_url?: string | null })[];
  coupon?: Coupon | null;
  payment?: {
    status: PaymentStatus;
    currency: string;
    amount: number;
    razorpay_order_id?: string | null;
    razorpay_payment_id?: string | null;
    error_description?: string | null;
  } | null;
}

export type OrderActionResponse = {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  message?: string;
  data?: OrderWithDetails | null;
};

/**
 * Valid Status Transitions Matrix
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'RESTAURANT_ACCEPTED', 'PREPARING', 'CANCELLED'],
  PAID: ['RESTAURANT_ACCEPTED', 'PREPARING', 'CANCELLED', 'REFUNDED'],
  RESTAURANT_ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

/**
 * 1. Zero-Trust Server-Side Order Placement
 */
export async function createOrderAction(params: {
  deliveryAddressId: string;
  paymentMethod: 'RAZORPAY' | 'COD';
  couponCode?: string;
  customerNotes?: string;
}): Promise<OrderActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to place an order.' };
  }

  // 1. Fetch customer delivery address
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: addressData, error: addressError } = await (supabase.from('addresses') as any)
    .select('*')
    .eq('id', params.deliveryAddressId)
    .eq('user_id', user.id)
    .single();

  if (addressError || !addressData) {
    return { success: false, error: 'Selected delivery address could not be verified.' };
  }
  const address = addressData as Address;

  // 2. Fetch customer cart and items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cartData } = await (supabase.from('carts') as any)
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!cartData || !cartData.restaurant_id) {
    return { success: false, error: 'Your cart is empty or has no restaurant assigned.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cartItemsData } = await (supabase.from('cart_items') as any)
    .select('*')
    .eq('cart_id', cartData.id);

  if (!cartItemsData || cartItemsData.length === 0) {
    return { success: false, error: 'Your cart is empty.' };
  }

  // 3. Verify restaurant is active and accepting orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: restaurantData, error: restError } = await (supabase.from('restaurants') as any)
    .select('*')
    .eq('id', cartData.restaurant_id)
    .single();

  if (restError || !restaurantData) {
    return { success: false, error: 'The selected restaurant could not be found.' };
  }
  const restaurant = restaurantData as Restaurant;

  if (!restaurant.is_active || !restaurant.is_accepting_orders) {
    return {
      success: false,
      error: `${restaurant.name} is currently closed or not accepting orders.`,
    };
  }

  // 4. Fetch CURRENT database prices and availability for every cart item
  const menuItemIds = cartItemsData.map((item: { menu_item_id: string }) => item.menu_item_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentMenuItems, error: itemsError } = await (supabase.from('menu_items') as any)
    .select('*')
    .in('id', menuItemIds)
    .eq('restaurant_id', restaurant.id);

  if (itemsError || !currentMenuItems || currentMenuItems.length !== menuItemIds.length) {
    return {
      success: false,
      error: 'One or more items in your cart are no longer offered by this restaurant.',
    };
  }

  // Map items and calculate subtotal securely on server
  type VerifiedItem = {
    menu_item_id: string;
    item_name: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    special_instructions: string | null;
  };

  const verifiedItems: VerifiedItem[] = [];
  let calculatedSubtotal = 0;

  for (const cartRow of cartItemsData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentItem = currentMenuItems.find((i: any) => i.id === cartRow.menu_item_id);
    if (!currentItem) {
      return { success: false, error: 'A dish in your cart is no longer available.' };
    }
    if (!currentItem.is_available) {
      return {
        success: false,
        error: `"${currentItem.name}" is currently out of stock. Please remove it from your cart.`,
      };
    }

    const unitPrice = Number(currentItem.price);
    const quantity = Number(cartRow.quantity);
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

    calculatedSubtotal += lineTotal;
    verifiedItems.push({
      menu_item_id: currentItem.id,
      item_name: currentItem.name,
      unit_price: unitPrice,
      quantity,
      total_price: lineTotal,
      special_instructions: cartRow.special_instructions || null,
    });
  }

  // Enforce minimum order value
  if (calculatedSubtotal < Number(restaurant.minimum_order)) {
    return {
      success: false,
      error: `Minimum order for ${restaurant.name} is ₹${restaurant.minimum_order}. Current subtotal is ₹${calculatedSubtotal.toFixed(2)}.`,
    };
  }

  // 5. Calculate delivery fee & platform taxes (5% GST)
  const deliveryFee = Number(restaurant.delivery_fee) || 0;
  const taxAmount = Math.round(calculatedSubtotal * 0.05 * 100) / 100;

  // 6. Validate Coupon if provided
  let discountAmount = 0;
  let validatedCouponId: string | null = null;

  if (params.couponCode && params.couponCode.trim()) {
    const cleanCode = params.couponCode.trim().toUpperCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: couponData } = await (supabase.from('coupons') as any)
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle();

    if (couponData) {
      const now = new Date();
      const validFrom = new Date(couponData.valid_from);
      const validUntil = new Date(couponData.valid_until);

      if (now >= validFrom && now <= validUntil && calculatedSubtotal >= Number(couponData.min_order_amount)) {
        validatedCouponId = couponData.id;
        if (couponData.discount_type === 'FIXED') {
          discountAmount = Number(couponData.discount_value);
        } else if (couponData.discount_type === 'PERCENTAGE') {
          discountAmount = (calculatedSubtotal * Number(couponData.discount_value)) / 100;
          if (couponData.max_discount_amount && discountAmount > Number(couponData.max_discount_amount)) {
            discountAmount = Number(couponData.max_discount_amount);
          }
        }
        discountAmount = Math.min(discountAmount, calculatedSubtotal);
        discountAmount = Math.round(discountAmount * 100) / 100;
      }
    }
  }

  // 7. Calculate server-verified Final Total
  const finalTotal = Math.max(
    0,
    Math.round((calculatedSubtotal + deliveryFee + taxAmount - discountAmount) * 100) / 100
  );

  // 8. Generate unique human-readable Order Number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `QB-${dateStr}-${randomSuffix}`;

  // Initial order status:
  // Both COD and Razorpay orders require explicit lifecycle verification.
  // For Razorpay online: Mark as PENDING_PAYMENT (held until online payment is confirmed).
  // For COD: Mark as PENDING_PAYMENT (placed by customer, but requires kitchen review & acceptance, with payment collected at delivery).
  const initialStatus: OrderStatus = 'PENDING_PAYMENT';

  // 9. Freeze Address Snapshot
  const addressSnapshot = {
    label: address.label,
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
  };

  // 10. Persist order record into PostgreSQL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newOrder, error: orderInsertError } = await (supabase.from('orders') as any)
    .insert({
      order_number: orderNumber,
      customer_id: user.id,
      restaurant_id: restaurant.id,
      delivery_address_id: address.id,
      delivery_address_snapshot: addressSnapshot,
      status: initialStatus,
      subtotal: calculatedSubtotal,
      delivery_fee: deliveryFee,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: finalTotal,
      coupon_id: validatedCouponId,
      customer_notes: params.customerNotes ? params.customerNotes.trim() : null,
    })
    .select()
    .single();

  if (orderInsertError || !newOrder) {
    console.error('Order creation error:', orderInsertError);
    return { success: false, error: 'Could not create order. Please try again.' };
  }

  // 11. Insert Order Items
  const orderItemsPayload = verifiedItems.map((item) => ({
    order_id: newOrder.id,
    menu_item_id: item.menu_item_id,
    item_name: item.item_name,
    unit_price: item.unit_price,
    quantity: item.quantity,
    total_price: item.total_price,
    special_instructions: item.special_instructions,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsInsertError } = await (supabase.from('order_items') as any).insert(
    orderItemsPayload
  );

  if (itemsInsertError) {
    console.error('Order items insertion error:', itemsInsertError);
    // Cleanup order if items fail
    await supabase.from('orders').delete().eq('id', newOrder.id);
    return { success: false, error: 'Failed to record ordered items.' };
  }

  // 12. Create Payment Record
  // Both COD and Razorpay start with status 'PENDING'.
  // COD payment is fulfilled in cash upon physical delivery.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('payments') as any).insert({
    order_id: newOrder.id,
    amount: finalTotal,
    currency: 'INR',
    status: 'PENDING',
    error_description: params.paymentMethod === 'COD' ? 'CASH_ON_DELIVERY' : null,
  });

  // 13. Record Coupon Usage if coupon was applied
  if (validatedCouponId && discountAmount > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('coupon_usage') as any).insert({
      coupon_id: validatedCouponId,
      user_id: user.id,
      order_id: newOrder.id,
      discount_amount: discountAmount,
    });

    // Increment coupon times_used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cData } = await (supabase.from('coupons') as any)
      .select('times_used')
      .eq('id', validatedCouponId)
      .single();
    if (cData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('coupons') as any)
        .update({ times_used: (cData.times_used || 0) + 1 })
        .eq('id', validatedCouponId);
    }
  }

  // 14. Clear Cart ONLY after order and line items are safely written
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('cart_items') as any).delete().eq('cart_id', cartData.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('carts') as any).update({ restaurant_id: null }).eq('id', cartData.id);

  // 15. Record Notifications Idempotently
  // Notify customer
  await createNotificationIdempotent({
    userId: user.id,
    orderId: newOrder.id,
    type: 'ORDER',
    title: `Order Placed #${newOrder.order_number}`,
    message: `Your order for ₹${finalTotal.toFixed(2)} with ${restaurant.name} has been placed successfully!`,
  });

  // Notify restaurant owner
  if (restaurant.owner_id) {
    await createNotificationIdempotent({
      userId: restaurant.owner_id,
      orderId: newOrder.id,
      type: 'ORDER',
      title: `New Order Received #${newOrder.order_number}`,
      message: `You have an incoming order of ₹${finalTotal.toFixed(2)} with ${verifiedItems.length} items.`,
    });
  }

  revalidatePath('/cart');
  revalidatePath('/checkout');
  revalidatePath('/orders');
  revalidatePath(`/orders/${newOrder.id}`);
  revalidatePath('/restaurant/orders');
  revalidatePath('/restaurant/dashboard');
  revalidatePath('/notifications');

  return {
    success: true,
    orderId: newOrder.id,
    orderNumber: newOrder.order_number,
    message: 'Your order has been placed successfully!',
  };
}

/**
 * 2. Get Order by ID with verified authorization
 */
export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderData, error: orderError } = await (supabase.from('orders') as any)
    .select('*, restaurant:restaurants(*), coupon:coupons(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) return null;

  // Authorization check: User must be customer, restaurant owner, or admin
  const isCustomer = orderData.customer_id === user.id;
  const isOwner = orderData.restaurant?.owner_id === user.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.role === 'ADMIN';

  if (!isCustomer && !isOwner && !isAdmin) {
    return null;
  }

  // Fetch line items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemsData } = await (supabase.from('order_items') as any)
    .select('*, menu_item:menu_items(image_url)')
    .eq('order_id', orderId);

  // Fetch payment record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paymentData } = await (supabase.from('payments') as any)
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (itemsData || []).map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    menu_item_id: row.menu_item_id,
    item_name: row.item_name,
    unit_price: Number(row.unit_price),
    quantity: row.quantity,
    total_price: Number(row.total_price),
    special_instructions: row.special_instructions,
    created_at: row.created_at,
    image_url: row.menu_item?.image_url || null,
  }));

  return {
    ...(orderData as Order),
    restaurant: orderData.restaurant as Restaurant,
    coupon: orderData.coupon as Coupon | null,
    items,
    payment: paymentData || null,
  };
}

/**
 * 3. Get all orders for the current customer
 */
export async function getCustomerOrders(): Promise<OrderWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersData, error } = await (supabase.from('orders') as any)
    .select('*, restaurant:restaurants(name, logo_url, phone, city), coupon:coupons(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !ordersData) return [];

  const orderIds = ordersData.map((o: { id: string }) => o.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemsData } = await (supabase.from('order_items') as any)
    .select('*')
    .in('order_id', orderIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paymentsData } = await (supabase.from('payments') as any)
    .select('*')
    .in('order_id', orderIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ordersData.map((order: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems = (itemsData || []).filter((i: any) => i.order_id === order.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payment = (paymentsData || []).find((p: any) => p.order_id === order.id);

    return {
      ...order,
      subtotal: Number(order.subtotal),
      delivery_fee: Number(order.delivery_fee),
      tax_amount: Number(order.tax_amount),
      discount_amount: Number(order.discount_amount),
      total_amount: Number(order.total_amount),
      restaurant: order.restaurant as Restaurant,
      items: orderItems,
      payment: payment || null,
    };
  });
}

/**
 * 4. Get active and historical orders for a restaurant partner
 */
export async function getRestaurantOrders(restaurantId: string): Promise<OrderWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Strict ownership check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rest } = await (supabase.from('restaurants') as any)
    .select('id, owner_id')
    .eq('id', restaurantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  if (!rest || (rest.owner_id !== user.id && profile?.role !== 'ADMIN')) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersData, error } = await (supabase.from('orders') as any)
    .select('*, restaurant:restaurants(*), customer:profiles(full_name, phone, email)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error || !ordersData) return [];

  const orderIds = ordersData.map((o: { id: string }) => o.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemsData } = await (supabase.from('order_items') as any)
    .select('*')
    .in('order_id', orderIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paymentsData } = await (supabase.from('payments') as any)
    .select('*')
    .in('order_id', orderIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ordersData.map((order: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems = (itemsData || []).filter((i: any) => i.order_id === order.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payment = (paymentsData || []).find((p: any) => p.order_id === order.id);

    return {
      ...order,
      subtotal: Number(order.subtotal),
      delivery_fee: Number(order.delivery_fee),
      tax_amount: Number(order.tax_amount),
      discount_amount: Number(order.discount_amount),
      total_amount: Number(order.total_amount),
      items: orderItems,
      payment: payment || null,
    };
  });
}

/**
 * 5. Update Order Status with Strict Transition Rules
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: OrderStatus,
  rejectionReason?: string
): Promise<OrderActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Fetch current order and associated restaurant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderData, error: orderError } = await (supabase.from('orders') as any)
    .select('*, restaurant:restaurants(owner_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    return { success: false, error: 'Order not found.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  const isCustomer = orderData.customer_id === user.id;
  const isOwner = orderData.restaurant?.owner_id === user.id;
  const isAdmin = profile?.role === 'ADMIN';

  // State Transition Guard
  const currentStatus: OrderStatus = orderData.status;
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition order status from ${currentStatus} to ${newStatus}.`,
    };
  }

  // Guard for PENDING_PAYMENT transitions:
  // Online orders CANNOT transition directly to RESTAURANT_ACCEPTED or PREPARING without payment.
  // Only valid Cash on Delivery orders (or ADMIN overrides) can be accepted directly from PENDING_PAYMENT.
  if (
    currentStatus === 'PENDING_PAYMENT' &&
    (newStatus === 'RESTAURANT_ACCEPTED' || newStatus === 'PREPARING')
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paymentRecord } = await (supabase.from('payments') as any)
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    const isCOD =
      paymentRecord?.error_description === 'CASH_ON_DELIVERY' ||
      orderData.payment_method === 'COD';

    if (!isCOD && !isAdmin) {
      return {
        success: false,
        error:
          'Online payment has not been completed. Only Cash on Delivery orders can be accepted directly.',
      };
    }
  }

  // Role Authorization Guard:
  // Customer can ONLY cancel before food preparation
  if (isCustomer && !isOwner && !isAdmin) {
    if (newStatus !== 'CANCELLED') {
      return { success: false, error: 'Customers cannot modify order progress.' };
    }
    if (currentStatus !== 'PENDING_PAYMENT' && currentStatus !== 'PAID') {
      return {
        success: false,
        error: 'Order has already been accepted by the kitchen and cannot be cancelled by customer.',
      };
    }
  }

  // Non-customer status transitions must be performed by restaurant owner or admin
  if (!isOwner && !isAdmin && newStatus !== 'CANCELLED') {
    return { success: false, error: 'Unauthorized to update order status.' };
  }

  // Update order
  const updatePayload: {
    status: OrderStatus;
    rejection_reason?: string | null;
    updated_at: string;
  } = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (rejectionReason) {
    updatePayload.rejection_reason = rejectionReason.trim();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('orders') as any)
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Sync payments for COD fulfillment and cancellations
  if (newStatus === 'DELIVERED') {
    // For Cash on Delivery orders, payment is collected upon physical delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payments') as any)
      .update({ status: 'SUCCESS', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('status', 'PENDING');
  }

  if (newStatus === 'CANCELLED') {
    // Refund paid orders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payments') as any)
      .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('status', 'SUCCESS');

    // Mark unpaid / pending orders as FAILED
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payments') as any)
      .update({
        status: 'FAILED',
        error_description: 'Order cancelled before payment completion',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('status', 'PENDING');
  }

  // Status Notification Generator
  const orderNum = orderData.order_number;
  const custId = orderData.customer_id;
  const ownerId = orderData.restaurant?.owner_id;

  const statusMessages: Partial<Record<OrderStatus, { title: string; msg: string }>> = {
    RESTAURANT_ACCEPTED: {
      title: `Order Accepted #${orderNum}`,
      msg: 'The restaurant has confirmed your order and will start cooking shortly.',
    },
    PREPARING: {
      title: `Cooking in Progress #${orderNum}`,
      msg: 'Your food is now being freshly prepared in the kitchen.',
    },
    READY_FOR_PICKUP: {
      title: `Order Packed & Ready #${orderNum}`,
      msg: 'Your order is packed and waiting for delivery partner pickup.',
    },
    OUT_FOR_DELIVERY: {
      title: `Out for Delivery #${orderNum}`,
      msg: 'Your order is on its way to your delivery location!',
    },
    DELIVERED: {
      title: `Order Delivered #${orderNum}`,
      msg: 'Your order has been delivered. Enjoy your meal!',
    },
    CANCELLED: {
      title: `Order Cancelled #${orderNum}`,
      msg: rejectionReason
        ? `Order cancelled: ${rejectionReason}`
        : 'Your order has been cancelled.',
    },
  };

  const notificationMeta = statusMessages[newStatus];
  if (notificationMeta && custId) {
    // Notify customer
    await createNotificationIdempotent({
      userId: custId,
      orderId,
      type: 'ORDER',
      title: notificationMeta.title,
      message: notificationMeta.msg,
    });
  }

  // If customer cancelled, alert the restaurant owner
  if (newStatus === 'CANCELLED' && isCustomer && ownerId) {
    await createNotificationIdempotent({
      userId: ownerId,
      orderId,
      type: 'ORDER',
      title: `Order Cancelled by Customer #${orderNum}`,
      message: rejectionReason || 'The customer has cancelled this order before preparation.',
    });
  }

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/restaurant/orders');
  revalidatePath('/restaurant/dashboard');
  revalidatePath('/notifications');

  return {
    success: true,
    message: `Order status updated to ${newStatus.replace(/_/g, ' ')}.`,
  };
}
