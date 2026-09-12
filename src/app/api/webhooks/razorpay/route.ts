import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    // Verify webhook authenticity
    const isValid = verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValid) {
      console.warn('Unauthorized Razorpay webhook signature detected.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    // Use administrative Supabase client for webhook processing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase server environment variables missing in webhook handler.');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Event 1: payment.captured (Customer completed online payment successfully)
    if (event === 'payment.captured' && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      if (razorpayOrderId) {
        // Find payment record matching razorpayOrderId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: paymentRecord } = await (supabase.from('payments') as any)
          .select('*, order:orders(*)')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (paymentRecord && paymentRecord.status !== 'SUCCESS') {
          // Update payment record
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('payments') as any)
            .update({
              razorpay_payment_id: razorpayPaymentId,
              status: 'SUCCESS',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRecord.id);

          // Transition order to PAID if not already progressed
          if (paymentRecord.order && paymentRecord.order.status === 'PENDING_PAYMENT') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('orders') as any)
              .update({
                status: 'PAID',
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentRecord.order_id);

            // In-app notification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('notifications') as any).insert({
              user_id: paymentRecord.order.customer_id,
              title: 'Payment Confirmed! 💳',
              message: `Your payment of ₹${Number(paymentRecord.amount).toFixed(2)} was received via Razorpay.`,
              type: 'ORDER',
              order_id: paymentRecord.order_id,
              is_read: false,
            });
          }
        }
      }
    }

    // Event 2: payment.failed (Payment attempt failed or was declined)
    if (event === 'payment.failed' && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('payments') as any)
          .update({
            status: 'FAILED',
            error_code: paymentEntity.error_code || 'PAYMENT_FAILED',
            error_description: paymentEntity.error_description || 'Payment failed on gateway.',
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', razorpayOrderId);
      }
    }

    // Event 3: refund.processed (Merchant or system refunded customer)
    if (event === 'refund.processed' && payload.payload?.refund?.entity) {
      const refundEntity = payload.payload.refund.entity;
      const paymentId = refundEntity.payment_id;

      if (paymentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: paymentRecord } = await (supabase.from('payments') as any)
          .select('*')
          .eq('razorpay_payment_id', paymentId)
          .maybeSingle();

        if (paymentRecord) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('payments') as any)
            .update({
              status: 'REFUNDED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRecord.id);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('orders') as any)
            .update({
              status: 'REFUNDED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRecord.order_id);
        }
      }
    }

    // Respond 200 OK to acknowledge receipt to Razorpay
    return NextResponse.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
