'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DetailedCart } from '@/actions/cart';
import {
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  validateCoupon,
} from '@/actions/cart';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  Store,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { Coupon } from '@/types/database.types';

interface Props {
  initialCart: DetailedCart;
}

export function CartView({ initialCart }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<DetailedCart>(initialCart);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const restaurant = cart.restaurant;
  const items = cart.items;

  // Financial Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * (item.menu_item?.price || 0),
    0
  );
  const deliveryFee = restaurant?.delivery_fee || 0;
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const finalTotal = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount);

  const minOrderMet = !restaurant || subtotal >= restaurant.minimum_order;
  const minOrderDiff = restaurant ? Math.max(0, restaurant.minimum_order - subtotal) : 0;

  async function handleQuantityChange(cartItemId: string, nextQty: number) {
    setLoadingItemId(cartItemId);
    const res = await updateCartItemQuantity(cartItemId, nextQty);
    if (res.success) {
      if (nextQty <= 0) {
        setCart({
          ...cart,
          items: cart.items.filter((i) => i.id !== cartItemId),
        });
      } else {
        setCart({
          ...cart,
          items: cart.items.map((i) =>
            i.id === cartItemId ? { ...i, quantity: nextQty } : i
          ),
        });
      }
      router.refresh();
    } else {
      alert(res.error || 'Failed to update item quantity.');
    }
    setLoadingItemId(null);
  }

  async function handleRemove(cartItemId: string) {
    setLoadingItemId(cartItemId);
    const res = await removeCartItem(cartItemId);
    if (res.success) {
      setCart({
        ...cart,
        items: cart.items.filter((i) => i.id !== cartItemId),
      });
      router.refresh();
    }
    setLoadingItemId(null);
  }

  async function handleClearCart() {
    if (!confirm('Are you sure you want to clear your entire cart?')) return;
    const res = await clearCart();
    if (res.success) {
      setCart({
        ...cart,
        items: [],
        restaurant: null,
      });
      setAppliedCoupon(null);
      setDiscountAmount(0);
      router.refresh();
    }
  }

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    const res = await validateCoupon(couponCode, subtotal);
    if (!res.valid) {
      setCouponError(res.error || 'Invalid coupon code');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } else {
      setAppliedCoupon(res.coupon || null);
      setDiscountAmount(res.discountAmount);
    }
    setCouponLoading(false);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponError(null);
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-stone-900">Your Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-stone-500 max-w-xs mx-auto">
          Good food is always cooking! Discover authentic kitchens in your area and order your favorites.
        </p>
        <div className="pt-2">
          <Link href="/restaurants">
            <Button size="lg" variant="primary">
              Browse Restaurants <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Items Section (Col 1 & 2) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Restaurant Header */}
        {restaurant && (
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-lg shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-stone-900 text-base">
                  {restaurant.name}
                </h2>
                <p className="text-xs text-stone-500">
                  {restaurant.address}, {restaurant.city} &bull; {restaurant.cuisine_types.join(', ')}
                </p>
              </div>
            </div>

            <button
              onClick={handleClearCart}
              className="text-xs font-semibold text-stone-400 hover:text-red-600 transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Cart
            </button>
          </div>
        )}

        {/* Dish Items List */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    item.menu_item?.is_veg ? 'border-emerald-600' : 'border-red-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.menu_item?.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  />
                </span>

                <div className="min-w-0">
                  <h3 className="font-bold text-stone-900 text-sm truncate">
                    {item.menu_item?.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    ₹{item.menu_item?.price.toFixed(2)} each
                  </p>
                </div>
              </div>

              {/* Quantity Adjuster */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 overflow-hidden shadow-sm">
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={loadingItemId === item.id}
                    className="p-2 hover:bg-stone-200 text-stone-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-stone-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    disabled={loadingItemId === item.id}
                    className="p-2 hover:bg-stone-200 text-stone-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="w-16 text-right font-extrabold text-stone-900 text-sm">
                  ₹{(item.quantity * (item.menu_item?.price || 0)).toFixed(2)}
                </span>

                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-stone-300 hover:text-red-600 transition cursor-pointer p-1"
                  title="Remove item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add more dishes quicklink */}
        {restaurant && (
          <div className="text-right">
            <Link
              href={`/restaurant/${restaurant.id}`}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
            >
              + Add more items from {restaurant.name}
            </Link>
          </div>
        )}
      </div>

      {/* Bill & Checkout Sidebar (Col 3) */}
      <div className="space-y-4">
        {/* Coupon Box */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
            <Tag className="w-4 h-4 text-orange-600" />
            <span>Apply Discount Coupon</span>
          </div>

          {appliedCoupon ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-extrabold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {appliedCoupon.code} Applied
                </p>
                <p className="text-[11px] text-emerald-700">Saved ₹{discountAmount.toFixed(2)}</p>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-xs font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME50"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 uppercase font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Button type="submit" size="sm" isLoading={couponLoading}>
                Apply
              </Button>
            </form>
          )}

          {couponError && (
            <p className="text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" /> {couponError}
            </p>
          )}

          <div className="text-[10px] text-stone-400 space-y-0.5 pt-1">
            <p>Try: <strong>WELCOME50</strong> (₹50 off on ₹199+)</p>
            <p>Try: <strong>QUICKBITE20</strong> (20% off on ₹399+)</p>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Bill Details
          </h3>

          <div className="space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-semibold text-stone-900">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Delivery Partner Fee</span>
              <span className="font-semibold text-stone-900">₹{deliveryFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>GST & Restaurant Charges (5%)</span>
              <span className="font-semibold text-stone-900">₹{taxAmount.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline text-stone-900">
              <span className="text-sm font-extrabold">To Pay</span>
              <span className="text-xl font-extrabold text-orange-600">
                ₹{finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Minimum Order Warning */}
          {!minOrderMet && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                Add ₹{minOrderDiff.toFixed(2)} more to reach minimum order of ₹{restaurant?.minimum_order}.
              </span>
            </div>
          )}

          {/* Checkout CTA */}
          <div className="pt-2">
            <Link
              href={minOrderMet ? (appliedCoupon ? `/checkout?coupon=${appliedCoupon.code}` : '/checkout') : '#'}
              className="w-full block"
            >
              <Button
                variant="primary"
                size="lg"
                disabled={!minOrderMet}
                className="w-full text-sm font-extrabold"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
