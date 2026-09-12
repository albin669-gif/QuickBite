'use client';

import React, { useState } from 'react';
import { toggleAcceptingOrders } from '@/actions/restaurant';
import { Power } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  restaurantId: string;
  initialAccepting: boolean;
}

export function AcceptingToggle({ restaurantId, initialAccepting }: Props) {
  const [isAccepting, setIsAccepting] = useState(initialAccepting);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const nextState = !isAccepting;
    setIsAccepting(nextState);

    const res = await toggleAcceptingOrders(restaurantId, nextState);
    if (!res.success) {
      // Revert if error
      setIsAccepting(!nextState);
      alert(res.error || 'Failed to update order acceptance status');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={clsx(
        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm',
        isAccepting
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
          : 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200'
      )}
    >
      <Power className={clsx('w-3.5 h-3.5', isAccepting ? 'text-emerald-600' : 'text-red-600')} />
      <span>{isAccepting ? 'ACCEPTING ORDERS' : 'ORDERS PAUSED'}</span>
      <span
        className={clsx(
          'w-2 h-2 rounded-full animate-pulse',
          isAccepting ? 'bg-emerald-500' : 'bg-red-500'
        )}
      />
    </button>
  );
}
