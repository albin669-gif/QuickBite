'use server';

import { createClient } from '@/lib/supabase/server';
import { getRazorpayClient, verifyPaymentSignature } from '@/lib/razorpay';
import { createNotificationIdempotent } from '@/actions/notification';
import { revalidatePath } from 'next/cache';
import type { Payment, Order } from '@/types/database.types';

export type PaymentActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface RazorpayOrderDetails {
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  orderNumber: string;
  keyId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

/**
 * 1. CREATE RAZORPAY ORDER
 * Reads the order from Supabase, recalculates/verifies the final amount from DB,
 * creates an upstream Razorpay order (or sandbox equivalent if credentials are placeholder),
 * and updates the payments record with razorpay_order_id.
 */
export async function createRazorpayOrderAction(
  orderId: string
): Promise<PaymentActionResponse<RazorpayOrderDetails>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required to initiate payment.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderErr } = await (supabase.from('orders') as any)
      .select('*, customer:profiles!customer_id(*), restaurant:restaurants(*)')
      .eq('id', orderId)
      .single();

    if (orderErr || !orderData) {
      return { success: false, error: 'Order not found.' };
    }

    const order = orderData as Order & {
      customer?: { full_name?: string; email?: string; phone?: string };
      restaurant?: { name?: string };
    };

    if (order.customer_id !== user.id) {
      return { success: false, error: 'Unauthorized: This order does not belong to you.' };
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return {
        success: false,
        error: `Order cannot be paid. Current status: ${order.status.replace(/_/g, ' ')}`,
      };
    }

    // Convert total_amount to paise (Razorpay integer requirement: 100 paise = ₹1)
    const amountInPaise = Math.round(Number(order.total_amount) * 100);

    if (amountInPaise <= 0) {
      return { success: false, error: 'Invalid order amount.' };
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret_456';
    const isSandboxPlaceholder =
      keyId.includes('placeholder') || keySecret.includes('placeholder');

    let razorpayOrderId = '';

    if (!isSandboxPlaceholder) {
      try {
        const razorpay = getRazorpayClient();
        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.order_number,
          notes: {
            order_id: order.id,
            order_number: order.order_number,
            customer_id: user.id,
          },
        });
        razorpayOrderId = rzpOrder.id;
      } catch (apiErr) {
        console.error('Razorpay live API error, falling back to simulated order:', apiErr);
        razorpayOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    } else {
      // Sandbox fallback order ID
      razorpayOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Update existing payment record or create one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingPayment } = await (supabase.from('payments') as any)
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingPayment) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('payments') as any)
        .update({
          razorpay_order_id: razorpayOrderId,
          status: 'PENDING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('payments') as any).insert({
        order_id: order.id,
        amount: order.total_amount,
        currency: 'INR',
        razorpay_order_id: razorpayOrderId,
        status: 'PENDING',
      });
    }

    return {
      success: true,
      data: {
        razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        orderNumber: order.order_number,
        keyId,
        customer: {
          name: order.customer?.full_name || 'QuickBite Customer',
          email: order.customer?.email || user.email || '',
          phone: order.customer?.phone || '9999999999',
        },
      },
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return { success: false, error: 'Internal server error while initializing payment.' };
  }
}

/**
 * 2. VERIFY PAYMENT SIGNATURE & COMPLETE ORDER
 * Validates HMAC SHA256 signature server-side.
 * Updates payment status to SUCCESS, transitions order to PAID,
 * records timestamps and generates in-app and push notifications.
 */
export async function verifyPaymentAction(params: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<PaymentActionResponse<{ orderId: string; status: string }>> {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderErr } = await (supabase.from('orders') as any)
      .select('*, restaurant:restaurants(*)')
      .eq('id', orderId)
      .single();

    if (orderErr || !orderData) {
      return { success: false, error: 'Order not found.' };
    }

    const order = orderData as Order & { restaurant?: { owner_id?: string; name?: string } };

    if (order.customer_id !== user.id) {
      return { success: false, error: 'Unauthorized: Not your order.' };
    }

    // Idempotency: If already paid, return success immediately
    if (order.status !== 'PENDING_PAYMENT') {
      return {
        success: true,
        data: { orderId: order.id, status: order.status },
      };
    }

    // Verify HMAC SHA256 signature
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const isSandboxPlaceholder = keyId.includes('placeholder');

    let isValidSignature = false;
    if (isSandboxPlaceholder && razorpaySignature.startsWith('sim_sig_')) {
      // In simulated sandbox development mode, allow verified simulation signature
      isValidSignature = true;
    } else {
      isValidSignature = verifyPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });
    }

    if (!isValidSignature) {
      // Log payment failure securely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('payments') as any)
        .update({
          status: 'FAILED',
          error_code: 'SIGNATURE_VERIFICATION_FAILED',
          error_description: 'Payment signature could not be verified by server.',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order.id);

      return {
        success: false,
        error: 'Payment verification failed. Invalid signature.',
      };
    }

    // 1. Update payments table record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payments') as any)
      .update({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: 'SUCCESS',
        error_code: null,
        error_description: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order.id);

    // 2. Transition Order to PAID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({
        status: 'PAID',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // 3. Trigger in-app & push notification for customer
    await createNotificationIdempotent({
      userId: user.id,
      title: 'Payment Successful! 🎉',
      message: `Your payment of ₹${Number(order.total_amount).toFixed(2)} for order ${order.order_number} was confirmed. Sent to ${order.restaurant?.name || 'the kitchen'}.`,
      type: 'ORDER',
      orderId: order.id,
    });

    // 4. Trigger notification for restaurant owner
    if (order.restaurant?.owner_id) {
      await createNotificationIdempotent({
        userId: order.restaurant.owner_id,
        title: 'New Paid Order! 🔔',
        message: `Order ${order.order_number} has been paid and is waiting for your acceptance.`,
        type: 'ORDER',
        orderId: order.id,
      });
    }

    revalidatePath(`/orders/${order.id}`);
    revalidatePath('/orders');
    revalidatePath('/restaurant/orders');
    revalidatePath('/admin/orders');

    return {
      success: true,
      data: {
        orderId: order.id,
        status: 'PAID',
      },
    };
  } catch (error) {
    console.error('Error verifying payment action:', error);
    return { success: false, error: 'Internal error while verifying payment.' };
  }
}

/**
 * 3. RECORD PAYMENT FAILURE
 * Updates payment status to FAILED with reason while keeping the order
 * available for payment retry without duplicating food items.
 */
export async function recordPaymentFailureAction(params: {
  orderId: string;
  errorCode?: string;
  errorDescription?: string;
}): Promise<PaymentActionResponse> {
  try {
    const { orderId, errorCode, errorDescription } = params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payments') as any)
      .update({
        status: 'FAILED',
        error_code: errorCode || 'PAYMENT_CANCELLED_OR_FAILED',
        error_description: errorDescription || 'Payment was cancelled or dismissed by the customer.',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('Error recording payment failure:', error);
    return { success: false, error: 'Could not record payment failure.' };
  }
}

/**
 * 4. GET PAYMENT DETAILS FOR AN ORDER
 */
export async function getOrderPaymentDetailsAction(
  orderId: string
): Promise<PaymentActionResponse<Payment>> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payment, error } = await (supabase.from('payments') as any)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error || !payment) {
      return { success: false, error: 'Payment details not found.' };
    }

    return { success: true, data: payment as Payment };
  } catch (error) {
    console.error('Error getting payment details:', error);
    return { success: false, error: 'Could not fetch payment details.' };
  }
}
