'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DetailedCart } from '@/actions/cart';
import type { Address, Profile, Coupon } from '@/types/database.types';
import {
  MapPin,
  Clock,
  CreditCard,
  Banknote,
  Store,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createOrderAction } from '@/actions/order';
import {
  createRazorpayOrderAction,
  verifyPaymentAction,
  recordPaymentFailureAction,
} from '@/actions/payment';
import { addCustomerAddress } from '@/actions/address';
import Link from 'next/link';

interface CheckoutViewProps {
  cart: DetailedCart;
  addresses: Address[];
  coupon: Coupon | null;
  discountAmount: number;
  customerProfile: Profile;
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

export function CheckoutView({
  cart,
  addresses: initialAddresses,
  coupon,
  discountAmount,
  customerProfile,
}: CheckoutViewProps) {
  const items = cart.items;
  const restaurant = cart.restaurant;

  const [savedAddresses, setSavedAddresses] = useState<Address[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAddresses.find((a) => a.is_default)?.id || initialAddresses[0]?.id || null
  );

  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [customerNotes, setCustomerNotes] = useState('');
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Address Modal/Form State
  const [showAddressForm, setShowAddressForm] = useState(initialAddresses.length === 0);
  const [addressLoading, setAddressLoading] = useState(false);

  const router = useRouter();

  // Price calculations
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * (item.menu_item?.price || 0),
    0
  );
  const deliveryFee = Number(restaurant?.delivery_fee) || 0;
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const finalTotal = Math.max(0, Math.round((subtotal + deliveryFee + taxAmount - discountAmount) * 100) / 100);

  async function handleAddAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddressLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await addCustomerAddress(formData);

    if (!res.success || !res.data) {
      alert(res.error || 'Failed to save delivery address.');
    } else {
      const newAddr = res.data;
      setSavedAddresses([newAddr, ...savedAddresses]);
      setSelectedAddressId(newAddr.id);
      setShowAddressForm(false);
    }
    setAddressLoading(false);
  }

  async function handlePlaceOrder() {
    setOrderError(null);

    if (!selectedAddressId) {
      setOrderError('Please select or add a delivery address to continue.');
      return;
    }

    if (!restaurant || !restaurant.is_accepting_orders) {
      setOrderError('This restaurant is currently closed or not accepting orders.');
      return;
    }

    if (items.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    if (subtotal < Number(restaurant.minimum_order)) {
      setOrderError(
        `Minimum order value for ${restaurant.name} is ₹${restaurant.minimum_order}. Please add more items.`
      );
      return;
    }

    setOrderPlacing(true);

    try {
      // 1. Create Order securely on the server
      const res = await createOrderAction({
        deliveryAddressId: selectedAddressId,
        paymentMethod,
        couponCode: coupon?.code,
        customerNotes,
      });

      if (!res.success || !res.orderId) {
        setOrderError(res.error || 'Failed to place order. Please try again.');
        setOrderPlacing(false);
        return;
      }

      const createdOrderId = res.orderId;

      // 2. Branch depending on Payment Method
      if (paymentMethod === 'COD') {
        // COD order confirmed directly
        router.push(`/orders/${createdOrderId}`);
        return;
      }

      // 3. Razorpay Online Payment Flow
      const rzpOrderRes = await createRazorpayOrderAction(createdOrderId);
      if (!rzpOrderRes.success || !rzpOrderRes.data) {
        setOrderError(rzpOrderRes.error || 'Failed to initialize payment gateway.');
        setOrderPlacing(false);
        return;
      }

      const paymentData = rzpOrderRes.data;

      // Load official Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();

      // If script could not load or running in sandbox simulation environment
      const isPlaceholder =
        paymentData.keyId.includes('placeholder') || !scriptLoaded || typeof window.Razorpay === 'undefined';

      if (isPlaceholder) {
        // Simulated sandbox payment verification for local development
        const simulatedPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const simulatedSignature = `sim_sig_${Date.now()}`;

        const verifyRes = await verifyPaymentAction({
          orderId: createdOrderId,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpayPaymentId: simulatedPaymentId,
          razorpaySignature: simulatedSignature,
        });

        if (verifyRes.success) {
          router.push(`/orders/${createdOrderId}`);
        } else {
          setOrderError(verifyRes.error || 'Payment verification failed.');
          setOrderPlacing(false);
        }
        return;
      }

      // Live / Real Razorpay Checkout Modal
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'QuickBite India',
        description: `Order #${paymentData.orderNumber}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: customerProfile.full_name || paymentData.customer.name,
          email: customerProfile.email || paymentData.customer.email,
          contact: customerProfile.phone || paymentData.customer.phone,
        },
        theme: {
          color: '#ea580c', // Orange-600
        },
        modal: {
          ondismiss: async function () {
            await recordPaymentFailureAction({
              orderId: createdOrderId,
              errorCode: 'PAYMENT_DISMISSED',
              errorDescription: 'User cancelled or dismissed the payment window.',
            });
            setOrderError('Payment was not completed. You can retry anytime from the order page.');
            setOrderPlacing(false);
            router.push(`/orders/${createdOrderId}`);
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            const verifyRes = await verifyPaymentAction({
              orderId: createdOrderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              router.push(`/orders/${createdOrderId}`);
            } else {
              setOrderError(verifyRes.error || 'Payment signature verification failed.');
              setOrderPlacing(false);
              router.push(`/orders/${createdOrderId}`);
            }
          } catch (vErr) {
            console.error('Signature verification error:', vErr);
            setOrderError('Server error while verifying payment signature.');
            setOrderPlacing(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', async function (resp: {
        error: { code: string; description: string };
      }) {
        await recordPaymentFailureAction({
          orderId: createdOrderId,
          errorCode: resp.error.code,
          errorDescription: resp.error.description,
        });
        setOrderError(`Payment failed: ${resp.error.description}`);
        setOrderPlacing(false);
        router.push(`/orders/${createdOrderId}`);
      });

      rzpInstance.open();
    } catch (err: unknown) {
      setOrderError(
        (err as Error)?.message || 'An unexpected error occurred while placing your order.'
      );
      setOrderPlacing(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Checkout Steps (Col 1 & 2) */}
      <div className="lg:col-span-2 space-y-6">
        {orderError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{orderError}</span>
          </div>
        )}

        {/* 1. Delivery Address Selection */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              1. Delivery Address
            </h2>
            {!showAddressForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressForm(true)}
                className="gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </Button>
            )}
          </div>

          {/* New Address Form */}
          {showAddressForm && (
            <form
              onSubmit={handleAddAddress}
              className="p-4 rounded-2xl border border-orange-200 bg-orange-50/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                  Add Delivery Address
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700">Label</label>
                  <select
                    name="label"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700">Flat / House No.</label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    placeholder="e.g. Flat 402, Lotus Tower"
                    required
                  />
                </div>
              </div>

              <Input
                id="addressLine2"
                name="addressLine2"
                placeholder="Street name, Area, Layout"
                required
              />

              <Input
                id="landmark"
                name="landmark"
                placeholder="Landmark / Nearby place (Optional)"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input id="city" name="city" defaultValue="Bangalore" placeholder="City" required />
                <Input id="state" name="state" defaultValue="Karnataka" placeholder="State" required />
                <Input id="postalCode" name="postalCode" placeholder="Postal PIN Code" required />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {savedAddresses.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddressForm(false)}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" size="sm" isLoading={addressLoading}>
                  Save & Use Address
                </Button>
              </div>
            </form>
          )}

          {/* Saved Addresses List */}
          {savedAddresses.length === 0 && !showAddressForm ? (
            <p className="text-xs text-stone-500">No saved addresses yet. Please add an address.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <label
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition ${
                      isSelected
                        ? 'border-orange-600 bg-orange-50/40 shadow-sm ring-1 ring-orange-500'
                        : 'border-stone-200 hover:bg-stone-50/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 px-2 py-0.5 rounded bg-stone-100 uppercase tracking-wider">
                          {addr.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-stone-900 pt-1">
                        {addr.address_line1}
                      </p>
                      {addr.landmark && (
                        <p className="text-[11px] text-stone-500">Near {addr.landmark}</p>
                      )}
                      <p className="text-[11px] text-stone-400">
                        {addr.city}, {addr.state} - {addr.postal_code}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Order Notes & Instructions */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            2. Cooking & Delivery Instructions
          </h2>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="e.g. Less spicy, keep sambar hot, leave at security desk..."
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* 3. Payment Method Selection */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              3. Choose Payment Method
            </h2>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Instant Verification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              onClick={() => setPaymentMethod('RAZORPAY')}
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                paymentMethod === 'RAZORPAY'
                  ? 'border-orange-600 bg-orange-50/40 ring-1 ring-orange-500 shadow-sm'
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'RAZORPAY'}
                onChange={() => setPaymentMethod('RAZORPAY')}
                className="text-orange-600 focus:ring-orange-500"
              />
              <div>
                <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-orange-600" /> Razorpay Secure Payment
                </p>
                <p className="text-[11px] text-stone-500">UPI, Google Pay, Cards, NetBanking</p>
              </div>
            </label>

            <label
              onClick={() => setPaymentMethod('COD')}
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                paymentMethod === 'COD'
                  ? 'border-orange-600 bg-orange-50/40 ring-1 ring-orange-500 shadow-sm'
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
                className="text-orange-600 focus:ring-orange-500"
              />
              <div>
                <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" /> Cash on Delivery (COD)
                </p>
                <p className="text-[11px] text-stone-500">Pay cash or UPI on delivery</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Order Summary & Final Bill (Col 3) */}
      <div className="space-y-4">
        {/* Restaurant Summary */}
        {restaurant && (
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-stone-900 text-sm truncate">
                  {restaurant.name}
                </h3>
                <p className="text-xs text-stone-400 truncate">
                  {restaurant.address}, {restaurant.city}
                </p>
              </div>
            </div>

            {/* Dishes Review */}
            <div className="divide-y divide-stone-100 border-t border-stone-100 pt-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-bold text-stone-700">{item.quantity}x</span>
                    <span className="text-stone-900 truncate">{item.menu_item?.name}</span>
                  </div>
                  <span className="font-bold text-stone-900 shrink-0">
                    ₹{(item.quantity * (item.menu_item?.price || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <Link href="/cart" className="text-xs font-bold text-orange-600 hover:underline block pt-1">
              Edit Cart Items &rarr;
            </Link>
          </div>
        )}

        {/* Bill Summary */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Payment Summary
          </h3>

          <div className="space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-semibold text-stone-900">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-semibold text-stone-900">₹{deliveryFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Taxes & GST (5%)</span>
              <span className="font-semibold text-stone-900">₹{taxAmount.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon ({coupon?.code})</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline text-stone-900">
              <span className="text-sm font-extrabold">Total Payable</span>
              <span className="text-xl font-extrabold text-orange-600">
                ₹{finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePlaceOrder}
            isLoading={orderPlacing}
            variant="primary"
            size="lg"
            className="w-full mt-3 text-sm font-extrabold"
          >
            {paymentMethod === 'RAZORPAY'
              ? `Pay with Razorpay (₹${finalTotal.toFixed(2)})`
              : `Confirm COD Order (₹${finalTotal.toFixed(2)})`}
          </Button>

          <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            100% Secure Checkout &bull; Razorpay &bull; India (INR ₹)
          </p>
        </div>
      </div>
    </div>
  );
}
