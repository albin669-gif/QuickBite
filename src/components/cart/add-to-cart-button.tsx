'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart, clearAndAddToCart } from '@/actions/cart';
import { CartConflictModal } from './cart-conflict-modal';
import { Plus, Check } from 'lucide-react';

interface Props {
  restaurantId: string;
  menuItemId: string;
  isAvailable?: boolean;
  isAcceptingOrders?: boolean;
}

export function AddToCartButton({
  restaurantId,
  menuItemId,
  isAvailable = true,
  isAcceptingOrders = true,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  // Conflict modal state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [existingRestName, setExistingRestName] = useState('');
  const [newRestName, setNewRestName] = useState('');

  if (!isAvailable || !isAcceptingOrders) {
    return (
      <span className="block text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 rounded-xl border border-stone-200">
        {!isAvailable ? 'Out of Stock' : 'Kitchen Closed'}
      </span>
    );
  }

  async function handleAdd() {
    setLoading(true);
    const res = await addToCart(restaurantId, menuItemId, 1);

    if (res.conflict) {
      setExistingRestName(res.existingRestaurantName || 'another restaurant');
      setNewRestName(res.newRestaurantName || 'this restaurant');
      setConflictOpen(true);
      setLoading(false);
      return;
    }

    if (!res.success) {
      if (res.error?.includes('sign in')) {
        router.push('/login?redirect=/restaurants');
      } else {
        alert(res.error || 'Failed to add item to cart.');
      }
      setLoading(false);
      return;
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    setLoading(false);
    router.refresh();
  }

  async function handleConfirmConflict() {
    setLoading(true);
    const res = await clearAndAddToCart(restaurantId, menuItemId, 1);
    setConflictOpen(false);
    if (!res.success) {
      alert(res.error || 'Failed to update cart.');
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading}
        className={`w-full py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1 ${
          added
            ? 'bg-emerald-600 text-white'
            : 'text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200'
        }`}
      >
        {loading ? (
          <span className="inline-block w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        ) : added ? (
          <>
            <Check className="w-3.5 h-3.5" /> ADDED
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" /> ADD
          </>
        )}
      </button>

      <CartConflictModal
        isOpen={conflictOpen}
        existingRestaurantName={existingRestName}
        newRestaurantName={newRestName}
        onConfirm={handleConfirmConflict}
        onCancel={() => setConflictOpen(false)}
        isLoading={loading}
      />
    </>
  );
}
