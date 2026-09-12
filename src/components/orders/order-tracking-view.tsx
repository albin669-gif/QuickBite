'use client';

import React, { useState, useEffect } from 'react';
import type { OrderWithDetails } from '@/actions/order';
import { updateOrderStatusAction } from '@/actions/order';
import {
  createRazorpayOrderAction,
  verifyPaymentAction,
  recordPaymentFailureAction,
} from '@/actions/payment';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Utensils,
  Bike,
  PackageCheck,
  IndianRupee,
  RefreshCw,
  AlertTriangle,
  FileText,
  Wifi,
  WifiOff,
  CreditCard,
  Zap,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewFormModal } from '@/components/reviews/review-form-modal';
import { checkReviewEligibilityAction } from '@/actions/review';
import { LiveDeliveryMap } from './live-delivery-map';
import type { Review } from '@/types/database.types';
import Link from 'next/link';

interface Props {
  order: OrderWithDetails;
  isOwnerOrAdmin?: boolean;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function OrderTrackingView({ order: initialOrder, isOwnerOrAdmin }: Props) {
  const [order, setOrder] = useState<OrderWithDetails>(initialOrder);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Review states
  const [reviewEligible, setReviewEligible] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Fetch real review eligibility for delivered order
  useEffect(() => {
    if (order.status === 'DELIVERED') {
      checkReviewEligibilityAction(order.id).then((res) => {
        setReviewEligible(res.eligible);
        if (res.existingReview) {
          setUserReview(res.existingReview);
        }
      });
    }
  }, [order.id, order.status]);

  // Supabase Realtime Subscription for live order status changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.new) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updated = payload.new as any;
            setOrder((prev) => ({
              ...prev,
              status: updated.status || prev.status,
              rejection_reason: updated.rejection_reason || prev.rejection_reason,
              updated_at: updated.updated_at || prev.updated_at,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `order_id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.new) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedPay = payload.new as any;
            setOrder((prev) => ({
              ...prev,
              payment: {
                ...(prev.payment || {}),
                ...updatedPay,
              },
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  // Address Snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const address = (order.delivery_address_snapshot as any) || {};

  // Status mapping to timeline steps
  const steps = [
    { key: 'PAID', label: 'Order Confirmed', icon: CheckCircle2 },
    { key: 'RESTAURANT_ACCEPTED', label: 'Accepted by Kitchen', icon: Utensils },
    { key: 'PREPARING', label: 'Cooking & Packing', icon: Clock },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: PackageCheck },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
  ];

  // Determine current active step index
  const statusRank: Record<string, number> = {
    PENDING_PAYMENT: 0,
    PAID: 1,
    RESTAURANT_ACCEPTED: 2,
    PREPARING: 3,
    READY_FOR_PICKUP: 4,
    OUT_FOR_DELIVERY: 5,
    DELIVERED: 6,
    CANCELLED: -1,
    REFUNDED: -1,
  };

  const currentRank = statusRank[order.status] ?? 0;
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const isPendingPayment = order.status === 'PENDING_PAYMENT';
  const canCustomerCancel =
    !isOwnerOrAdmin &&
    (order.status === 'PENDING_PAYMENT' || order.status === 'PAID');

  async function handleCustomerCancel() {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    setCancelError(null);

    const res = await updateOrderStatusAction(order.id, 'CANCELLED', 'Cancelled by customer');
    if (!res.success) {
      setCancelError(res.error || 'Failed to cancel order.');
    } else {
      setOrder((prev) => ({
        ...prev,
        status: 'CANCELLED',
        rejection_reason: 'Cancelled by customer',
      }));
    }
    setCancelling(false);
  }

  async function handleRetryPayment() {
    setRetryingPayment(true);
    setPaymentError(null);

    try {
      const rzpOrderRes = await createRazorpayOrderAction(order.id);
      if (!rzpOrderRes.success || !rzpOrderRes.data) {
        setPaymentError(rzpOrderRes.error || 'Could not initiate payment.');
        setRetryingPayment(false);
        return;
      }

      const paymentData = rzpOrderRes.data;
      const scriptLoaded = await loadRazorpayScript();
      const isPlaceholder =
        paymentData.keyId.includes('placeholder') || !scriptLoaded || typeof window.Razorpay === 'undefined';

      if (isPlaceholder) {
        // Development simulation verification
        const simulatedPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const simulatedSignature = `sim_sig_${Date.now()}`;

        const verifyRes = await verifyPaymentAction({
          orderId: order.id,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpayPaymentId: simulatedPaymentId,
          razorpaySignature: simulatedSignature,
        });

        if (verifyRes.success) {
          setOrder((prev) => ({
            ...prev,
            status: 'PAID',
            payment: {
              status: 'SUCCESS',
              currency: prev.payment?.currency || 'INR',
              amount: prev.payment?.amount || Number(prev.total_amount),
              razorpay_order_id: paymentData.razorpayOrderId,
              razorpay_payment_id: simulatedPaymentId,
            },
          }));
        } else {
          setPaymentError(verifyRes.error || 'Payment verification failed.');
        }
        setRetryingPayment(false);
        return;
      }

      // Live Razorpay modal
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'QuickBite India',
        description: `Retry Payment for #${order.order_number}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          contact: paymentData.customer.phone,
        },
        theme: {
          color: '#ea580c',
        },
        modal: {
          ondismiss: async function () {
            await recordPaymentFailureAction({
              orderId: order.id,
              errorCode: 'PAYMENT_DISMISSED',
              errorDescription: 'User cancelled or dismissed the payment window.',
            });
            setPaymentError('Payment was not completed. You can retry at any time.');
            setRetryingPayment(false);
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            const verifyRes = await verifyPaymentAction({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              setOrder((prev) => ({
                ...prev,
                status: 'PAID',
                payment: {
                  status: 'SUCCESS',
                  currency: prev.payment?.currency || 'INR',
                  amount: prev.payment?.amount || Number(prev.total_amount),
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                },
              }));
            } else {
              setPaymentError(verifyRes.error || 'Payment verification failed.');
            }
          } catch (vErr) {
            console.error('Signature verification error:', vErr);
            setPaymentError('Server error while verifying payment.');
          } finally {
            setRetryingPayment(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', async function (resp: {
        error: { code: string; description: string };
      }) {
        await recordPaymentFailureAction({
          orderId: order.id,
          errorCode: resp.error.code,
          errorDescription: resp.error.description,
        });
        setPaymentError(`Payment failed: ${resp.error.description}`);
        setRetryingPayment(false);
      });

      rzpInstance.open();
    } catch (err: unknown) {
      setPaymentError((err as Error)?.message || 'An unexpected error occurred during payment retry.');
      setRetryingPayment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
              {order.status.replace(/_/g, ' ')}
            </span>

            {/* Realtime Connection Status Pill */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  : 'bg-stone-50 text-stone-500 border-stone-200'
              }`}
              title={
                connectionStatus === 'connected'
                  ? 'Live real-time updates active'
                  : 'Reconnecting to live channel'
              }
            >
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-600" /> Live
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-stone-400" /> Offline
                </>
              )}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Order #{order.order_number}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Ordered from <span className="font-semibold text-stone-800">{order.restaurant?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh Status</span>
          </button>

          {canCustomerCancel && (
            <Button
              variant="outline"
              size="sm"
              isLoading={cancelling}
              onClick={handleCustomerCancel}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Cancel Order
            </Button>
          )}

          {isOwnerOrAdmin && (
            <Link href="/restaurant/orders">
              <Button size="sm" variant="outline">
                Kitchen Terminal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Payment Pending Alert / Retry Banner */}
      {isPendingPayment && order.payment?.error_description !== 'CASH_ON_DELIVERY' && (
        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-950">Payment Required to Confirm Order</h3>
            </div>
            <p className="text-xs text-amber-800">
              Your order is held. Complete the Razorpay payment of ₹{Number(order.total_amount).toFixed(2)} to notify the kitchen.
            </p>
            {paymentError && (
              <p className="text-xs text-red-600 font-medium pt-1">{paymentError}</p>
            )}
          </div>
          <Button
            onClick={handleRetryPayment}
            isLoading={retryingPayment}
            variant="primary"
            size="sm"
            className="shrink-0 gap-1.5 shadow-sm font-bold"
          >
            <Zap className="w-4 h-4" /> Pay Now (₹{Number(order.total_amount).toFixed(2)})
          </Button>
        </div>
      )}

      {/* COD Pending Kitchen Acceptance Banner */}
      {isPendingPayment && order.payment?.error_description === 'CASH_ON_DELIVERY' && (
        <div className="p-6 rounded-3xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-bold text-blue-950">Cash on Delivery Order Placed</h3>
            </div>
            <p className="text-xs text-blue-800">
              Your order was sent to {order.restaurant?.name}. Awaiting restaurant review & confirmation. You will pay ₹{Number(order.total_amount).toFixed(2)} in cash or UPI at your doorstep upon delivery.
            </p>
          </div>
        </div>
      )}

      {/* Cancel Error Alert */}
      {cancelError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Cancelled Banner if applicable */}
      {isCancelled && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold">This order was cancelled</h3>
            <p className="text-xs text-red-700 mt-0.5">
              Reason: {order.rejection_reason || 'Order cancelled by restaurant or customer.'}
            </p>
          </div>
        </div>
      )}

      {/* Timeline Progress Bar (if not cancelled) */}
      {!isCancelled && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h2 className="text-sm font-bold text-stone-900 mb-6 uppercase tracking-wider">
            Live Order Status
          </h2>

          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {steps.map((step, idx) => {
              const stepRank = idx + 1;
              const isCompleted = currentRank >= stepRank;
              const isCurrent = currentRank === stepRank;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className="flex md:flex-col items-center gap-3.5 z-10 w-full md:w-auto"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25'
                        : isCurrent
                        ? 'bg-orange-100 text-orange-600 ring-4 ring-orange-50 animate-pulse'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div className="md:text-center">
                    <p
                      className={`text-xs font-bold ${
                        isCompleted || isCurrent ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] text-orange-600 font-semibold block">
                        In Progress...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-time Delivery Partner & GPS Live Map */}
      {!isCancelled &&
        order.status !== 'PENDING_PAYMENT' && (
          <LiveDeliveryMap
            orderId={order.id}
            orderNumber={order.order_number}
            restaurantName={order.restaurant?.name || 'Restaurant Kitchen'}
            customerAddressText={`${address.address_line1}, ${address.city}`}
            orderStatus={order.status}
          />
        )}

      {/* Delivered Order Review Card */}
      {order.status === 'DELIVERED' && !isOwnerOrAdmin && (
        <div>
          {showReviewModal ? (
            <ReviewFormModal
              orderId={order.id}
              orderNumber={order.order_number}
              restaurantName={order.restaurant?.name || 'Restaurant'}
              onCancel={() => setShowReviewModal(false)}
              onSuccess={() => {
                setShowReviewModal(false);
                checkReviewEligibilityAction(order.id).then((res) => {
                  setReviewEligible(res.eligible);
                  if (res.existingReview) setUserReview(res.existingReview);
                });
              }}
            />
          ) : userReview ? (
            <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Meal Review Submitted
                </span>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= userReview.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-stone-800 ml-1">
                    {userReview.rating}.0
                  </span>
                </div>
              </div>
              {userReview.comment && (
                <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-100 italic">
                  &ldquo;{userReview.comment}&rdquo;
                </p>
              )}
              {userReview.owner_reply && (
                <div className="mt-2 p-3 bg-orange-50/70 border border-orange-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-orange-950 flex items-center gap-1">
                    💬 Response from {order.restaurant?.name}:
                  </span>
                  <p className="text-stone-700">{userReview.owner_reply}</p>
                </div>
              )}
            </div>
          ) : reviewEligible ? (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl border border-orange-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-orange-950 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  How was your meal from {order.restaurant?.name}?
                </h3>
                <p className="text-xs text-orange-900/80">
                  Your order has been delivered! Leave a verified review to help fellow food lovers and support this restaurant.
                </p>
              </div>
              <Button
                onClick={() => setShowReviewModal(true)}
                variant="primary"
                size="sm"
                className="shrink-0 font-bold shadow-sm"
              >
                Write a Review
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Order Summary & Restaurant Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ordered Items (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
            <h2 className="text-base font-extrabold text-stone-900 mb-4 border-b border-stone-100 pb-3">
              Ordered Items ({order.items?.length || 0})
            </h2>

            <div className="divide-y divide-stone-100">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{item.item_name}</p>
                      <p className="text-xs text-stone-400">
                        ₹{item.unit_price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    ₹{item.total_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Special Instructions Note */}
            {order.customer_notes && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Cooking / Delivery Instructions:
                </span>
                <p>{order.customer_notes}</p>
              </div>
            )}
          </div>

          {/* Restaurant Details */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <MapPin className="w-5 h-5 text-orange-600" />
              Restaurant Information
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div>
                <p className="text-sm font-bold text-stone-900">{order.restaurant?.name}</p>
                <p className="text-xs text-stone-500">
                  {order.restaurant?.address}, {order.restaurant?.city} - {order.restaurant?.postal_code}
                </p>
              </div>
              {order.restaurant?.phone && (
                <a
                  href={`tel:${order.restaurant.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 p-2 rounded-xl bg-orange-50 border border-orange-100 w-fit"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {order.restaurant.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bill Summary & Frozen Address (Col 3) */}
        <div className="space-y-6">
          {/* Bill Summary */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <IndianRupee className="w-5 h-5 text-orange-600" />
              Bill Summary
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Item Subtotal</span>
                <span>₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Fee</span>
                <span>₹{Number(order.delivery_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Taxes & GST (5%)</span>
                <span>₹{Number(order.tax_amount).toFixed(2)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount {order.coupon?.code ? `(${order.coupon.code})` : ''}</span>
                  <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-stone-200 pt-3 flex justify-between text-base font-extrabold text-stone-900">
                <span>Total Amount</span>
                <span className="text-orange-600">₹{Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500">Payment Method</span>
              <span className="font-bold text-stone-800 text-[11px]">
                {order.payment?.error_description === 'CASH_ON_DELIVERY'
                  ? 'Cash on Delivery (COD)'
                  : 'Razorpay Secure Online'}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-stone-500">Payment Status</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                  order.payment?.status === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.payment?.status === 'REFUNDED'
                    ? 'bg-purple-100 text-purple-800'
                    : order.payment?.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.payment?.error_description === 'CASH_ON_DELIVERY' && order.payment?.status === 'PENDING'
                  ? 'Pay at Doorstep'
                  : order.payment?.status || 'PENDING'}
              </span>
            </div>

            {order.payment?.razorpay_payment_id && (
              <p className="text-[10px] text-stone-400 font-mono pt-1">
                Ref: {order.payment.razorpay_payment_id}
              </p>
            )}
          </div>

          {/* Frozen Delivery Address Snapshot */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-2">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <MapPin className="w-5 h-5 text-orange-600" />
              Delivery Address
            </h2>
            <div className="text-xs text-stone-600 space-y-1 pt-1">
              <span className="inline-block px-2 py-0.5 rounded bg-stone-100 font-bold uppercase text-[10px] text-stone-800">
                {address.label || 'Delivery Location'}
              </span>
              <p className="font-semibold text-stone-900 pt-1">{address.address_line1}</p>
              {address.landmark && (
                <p className="text-stone-500">Landmark: {address.landmark}</p>
              )}
              <p className="text-stone-500">
                {address.city}, {address.state} - {address.postal_code}
              </p>
            </div>
          </div>

          <Link href="/restaurants" className="block">
            <Button variant="outline" className="w-full">
              Continue Browsing Food
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
